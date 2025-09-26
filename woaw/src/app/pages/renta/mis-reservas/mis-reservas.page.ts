import { Component, ChangeDetectionStrategy, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ReservaService, RentalBooking } from '../../../services/reserva.service';
import { finalize, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-mis-reservas',
  templateUrl: './mis-reservas.page.html',
  styleUrls: ['./mis-reservas.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MisReservasPage implements OnInit {
  loading = false;
  datos: RentalBooking[] = [];

  pendingOwner: Array<RentalBooking & { dias?: number }> = [];
  loadingPending = false;
  actingIds = new Set<string>();
  actingAction: 'accept' | 'cancel' | 'start' | 'finish' | null = null;

  private myUserId: string | null = null;
  private myRole: 'admin' | 'lotero' | 'vendedor' | 'cliente' | 'invitado' = 'invitado';

  page = 1;
  limit = 8;
  hasMore = true;
  loadingMore = false;

  private myAll: RentalBooking[] = [];       // reservas que YO hice
  private ownerAll: RentalBooking[] = [];    // reservas hechas a MIS coches
  private mergedAll: RentalBooking[] = [];
  private myAllLoaded = false;
  private ownerAllLoaded = false;

  constructor(
    private reservas: ReservaService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toast: ToastController
  ) { }

  ngOnInit(): void {
    const me = this.leerUsuario();
    this.myUserId = me.id;
    this.myRole = me.rol as any;
    this.cargar();
  }

  doRefresh(ev: CustomEvent): void {
    this.page = 1;
    this.hasMore = true;
    this.loadingMore = false;

    this.myAllLoaded = false;
    this.ownerAllLoaded = false;
    this.myAll = [];
    this.ownerAll = [];
    this.mergedAll = [];

    this.pendingOwner = [];
    this.loadingPending = false;
    this.actingIds.clear();
    this.actingAction = null;

    this.cargar(() => (ev.target as any).complete());
  }

  private cargar(done?: () => void): void {
    this.loading = !(this.myAllLoaded && (this.myUserId ? this.ownerAllLoaded : true));
    this.cdr.markForCheck();

    const petMy$ = this.myAllLoaded
      ? of(this.myAll)
      : this.reservas.getMyBookings().pipe(
        timeout(6000),
        catchError(() => of([] as RentalBooking[]))
      );

    petMy$.subscribe((mine) => {
      if (!this.myAllLoaded) {
        this.myAll = (mine || []).sort(this.sortBookingDesc);
        this.myAllLoaded = true;
      }
      this.aplicarPaginaBase(this.myAll);
    });

    /** --- RESERVAS A MIS COCHES (solo si tengo myUserId) --- */
    if (!this.myUserId) {
      this.loading = false;
      this.loadingMore = false;
      this.cdr.markForCheck();
      done?.();
      return;
    }

    this.loadingPending = true;

    const filtroOwner: any = {
      page: 1,
      limit: 100,
      sort: '-createdAt',
      // Intentamos varias llaves de servidor
      ownerId: this.myUserId,
      rentalCarOwnerId: this.myUserId,
      owner: this.myUserId,
      propietarioId: this.myUserId, // clave real que trae tu payload
    };

    const petOwner$ = this.ownerAllLoaded
      ? of({ bookings: this.ownerAll })
      : this.reservas.listarBookings(filtroOwner).pipe(
        timeout(6000),
        catchError(() => of({ total: 0, page: 1, pages: 1, bookings: [] }))
      );

    petOwner$
      .pipe(
        finalize(() => {
          this.loading = false;
          this.loadingMore = false;
          this.loadingPending = false;
          this.cdr.markForCheck();
          done?.();
        })
      )
      .subscribe((resp: any) => {
        const owners: RentalBooking[] = (Array.isArray(resp) ? resp : resp?.bookings) || [];

        if (!this.ownerAllLoaded) {
          // Si rentalCar es string (no populado), confiamos en el filtro del servidor.
          const seguros = owners.filter(b => {
            const rc: any = (b as any)?.rentalCar;
            if (typeof rc === 'string') return true;
            if (!rc) return false;
            return this.soyPropietarioDeAuto(b);
          });

          this.ownerAll = (seguros || []).sort(this.sortBookingDesc);
          this.ownerAllLoaded = true;
        }

        // NUEVO: calcular pendientes del dueño
        this.pendingOwner = this.ownerAll
          .filter(b => b?.estatus === 'pendiente')
          .map(b => ({ ...b, dias: this.calcDays(b.fechaInicio, b.fechaFin) }));

        // Merge sin duplicados
        const map = new Map<string, RentalBooking>();
        [...this.myAll, ...this.ownerAll].forEach(b => map.set(b._id, b));
        this.mergedAll = Array.from(map.values()).sort(this.sortBookingDesc);

        this.aplicarPaginaBase(this.mergedAll);
      });
  }

  cargarMas(ev: CustomEvent): void {
    if (!this.hasMore || this.loadingMore) { (ev.target as any).complete(); return; }
    this.loadingMore = true;
    this.page++;

    const universo = this.mergedAll.length ? this.mergedAll : this.myAll;
    const end = this.page * this.limit;
    this.datos = universo.slice(0, end);
    const total = universo.length;
    this.hasMore = this.datos.length < total;

    this.loadingMore = false;
    this.cdr.markForCheck();
    (ev.target as any).complete();
  }

  trackByBooking(_i: number, b: RentalBooking) { return b._id; }

  colorEstatus(s: RentalBooking['estatus']): string {
    switch (s) {
      case 'pendiente': return 'medium';
      case 'aceptada': return 'primary';
      case 'en_curso': return 'warning';
      case 'finalizada': return 'success';
      case 'cancelada': return 'danger';
      default: return 'medium';
    }
  }

  private leerUsuario(): {
    id: string | null;
    rol: 'admin' | 'lotero' | 'vendedor' | 'cliente' | 'invitado';
  } {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return { id: null, rol: 'invitado' };
      const u = JSON.parse(raw);

      // Soporta más alias para el id
      const id =
        u?._id || u?.id || u?.uid || u?.userId || u?.usuarioId || null;

      const rolSrc = (u?.rol || u?.role || 'invitado').toString().toLowerCase();
      const allowed = new Set(['admin', 'lotero', 'vendedor', 'cliente']);
      const safeRol = (allowed.has(rolSrc) ? rolSrc : 'invitado') as any;

      return { id, rol: safeRol };
    } catch {
      return { id: null, rol: 'invitado' };
    }
  }

  private sortBookingDesc = (a: RentalBooking, b: RentalBooking) => {
    const ka = a.createdAt || a.fechaInicio || '';
    const kb = b.createdAt || b.fechaInicio || '';
    return (kb as string).localeCompare(ka as string);
  };

  public soyPropietarioDeAuto(b: RentalBooking): boolean {
    if (!this.myUserId) return false;

    // si viene directo en el booking
    const directOwner = (b as any)?.rentalCarOwnerId || (b as any)?.propietarioId;
    if (typeof directOwner === 'string' && directOwner) return directOwner === this.myUserId;

    const rc: any = (b as any)?.rentalCar;
    if (rc && typeof rc === 'object') {
      // contemplamos varias llaves comunes
      const owner =
        rc.owner || rc.ownerId || rc.dueno || rc.propietario || rc.propietarioId || rc.user || rc.usuario;

      if (typeof owner === 'string') return owner === this.myUserId;

      if (owner && typeof owner === 'object') {
        const oid = owner?._id || owner?.id || owner?.uid || owner?.userId || null;
        if (oid) return oid === this.myUserId;
      }

      // si viene como campo directo tipo string
      if (typeof rc?.propietarioId === 'string') return rc.propietarioId === this.myUserId;
      if (typeof rc?.ownerId === 'string') return rc.ownerId === this.myUserId;
    }
    return false;
  }

  public esSolicitante(b: RentalBooking): boolean {
    try {
      if (!b) return false;
      const raw = localStorage.getItem('user');
      if (!raw) return false;
      const me = JSON.parse(raw);
      const myId = me?._id || me?.id || me?.uid || me?.userId || me?.usuarioId || null;
      if (!myId) return false;

      const u: any = (b as any).usuario;
      if (!u) return false;
      if (typeof u === 'string') return u === myId;
      const uid = u?._id || u?.id || u?.uid || u?.userId || null;
      return uid === myId;
    } catch {
      return false;
    }
  }

  /** ====== Helpers de fecha (sin TZ shift) ====== */
  private normalizarFechaLocalISO(d: string | Date): string {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  public esHoy(fecha: string | Date): boolean {
    const hoy = this.normalizarFechaLocalISO(new Date());
    const f = this.normalizarFechaLocalISO(fecha);
    return hoy === f;
  }

  public tieneCheckIn(b: RentalBooking): boolean {
    const ci: any = (b as any)?.checkIn;
    if (!ci) return false;
    const tieneAlgo =
      (ci.combustible != null) ||
      (typeof ci.notas === 'string' && ci.notas.trim().length > 0) ||
      (Array.isArray(ci.fotos) && ci.fotos.length > 0) ||
      Boolean(ci.fecha);
    return !!tieneAlgo;
  }

  public puedeIniciar(b: RentalBooking): boolean {
    return this.soyPropietarioDeAuto(b)
      && b?.estatus === 'aceptada'
      && this.esHoy(b?.fechaInicio as any)
      && this.tieneCheckIn(b);
  }

  /** ✅ Mostrar botón de Finalizar si soy dueño y está en curso (sin importar el día) */
  public puedeFinalizar(b: RentalBooking): boolean {
    return this.soyPropietarioDeAuto(b)
      && b?.estatus === 'en_curso';
  }

  async iniciarRenta(b: RentalBooking) {
    if (!b?._id) return;

    // Guardas defensivas
    if (!this.soyPropietarioDeAuto(b)) {
      await constToast(this.toast, 'Solo el propietario puede iniciar la renta', 'warning');
      return;
    }
    if (b.estatus !== 'aceptada') {
      await constToast(this.toast, 'La renta debe estar aceptada para iniciar', 'warning');
      return;
    }
    if (!this.esHoy(b.fechaInicio)) {
      await constToast(this.toast, 'Solo puedes iniciar el día de inicio', 'warning');
      return;
    }
    if (!this.tieneCheckIn(b)) {
      await constToast(this.toast, 'No puedes iniciar sin Check-In', 'danger');
      return;
    }

    this.actingAction = 'start';
    this.actingIds.add(b._id);
    this.cdr.markForCheck();

    const rs: any = this.reservas as any;
    let pet$;
    if (typeof rs.startBooking === 'function') {
      pet$ = rs.startBooking(b._id);
    } else if (typeof rs.setStatus === 'function') {
      pet$ = rs.setStatus(b._id, 'en_curso');
    } else {
      pet$ = of({ ok: false });
    }

    pet$.subscribe({
      next: async () => {
        const patch = (x: RentalBooking) => x._id === b._id ? ({ ...x, estatus: 'en_curso' } as RentalBooking) : x;

        this.ownerAll = this.ownerAll.map(patch);
        this.myAll = this.myAll.map(patch);
        this.mergedAll = this.mergedAll.map(patch);
        this.datos = this.datos.map(patch);

        await constToast(this.toast, 'Renta iniciada', 'success');
      },
      error: async () => {
        await constToast(this.toast, 'No se pudo iniciar la renta', 'danger');
      },
      complete: () => {
        this.actingIds.delete(b._id);
        this.actingAction = null;
        this.cdr.markForCheck();
      }
    });
  }

  /** ⛳ Ahora solo navega al Checkout (NO cambia el estatus aquí) */
  irCheckout(b: RentalBooking) {
    if (!b?._id) return;
    if (!this.soyPropietarioDeAuto(b)) return;
    if (b.estatus !== 'en_curso') return;

    this.router.navigate(['/checkout', b._id]);
  }

  irAccion(b: RentalBooking): void {
    const soyOwner = this.soyPropietarioDeAuto(b);
    const soyCliente = this.esSolicitante(b);

    if (soyOwner) {
      if (b.estatus === 'aceptada') {
        this.router.navigate(['/checkin', b._id]);
        return;
      }
      if (b.estatus === 'en_curso') {
        this.router.navigate(['/checkin', b._id], { queryParams: { viewerOnly: '1' } });
        return;
      }
      if (b.estatus === 'finalizada') {
        this.router.navigate(['/checkout', b._id]);
        return;
      }
    }

    if (soyCliente) {
      if (b.estatus === 'finalizada') {
        this.router.navigate(['/checkout', b._id], { queryParams: { viewerOnly: '1' } });
        return;
      }
      if (b.estatus === 'aceptada' || b.estatus === 'en_curso') {
        this.router.navigate(['/checkin', b._id], { queryParams: { viewerOnly: '1' } });
        return;
      }
    }

    this.openDetalle(b);
  }


  openDetalle(b: RentalBooking): void {
    console.log('Detalle de reserva:', b);
  }

  acceptPending(b: RentalBooking) {
    if (!b?._id) return;
    this.actingAction = 'accept';
    this.actingIds.add(b._id);
    this.cdr.markForCheck();

    this.reservas.acceptBooking(b._id).subscribe({
      next: () => {
        // actualizar estados en memoria
        this.ownerAll = this.ownerAll.map(x => x._id === b._id ? { ...x, estatus: 'aceptada' } as RentalBooking : x);
        this.mergedAll = this.mergedAll.map(x => x._id === b._id ? { ...x, estatus: 'aceptada' } as RentalBooking : x);
        this.pendingOwner = this.pendingOwner.filter(x => x._id !== b._id);
        this.datos = this.datos.map(x => x._id === b._id ? { ...x, estatus: 'aceptada' } as RentalBooking : x);
      },
      error: (err) => console.error(err),
      complete: () => {
        this.actingIds.delete(b._id);
        this.actingAction = null;
        this.cdr.markForCheck();
      }
    });
  }

  cancelPending(b: RentalBooking) {
    if (!b?._id) return;
    this.actingAction = 'cancel';
    this.actingIds.add(b._id);
    this.cdr.markForCheck();

    this.reservas.cancelBooking(b._id, 'Cancelada por propietario').subscribe({
      next: () => {
        this.ownerAll = this.ownerAll.map(x => x._id === b._id ? { ...x, estatus: 'cancelada' } as RentalBooking : x);
        this.mergedAll = this.mergedAll.map(x => x._id === b._id ? { ...x, estatus: 'cancelada' } as RentalBooking : x);
        this.pendingOwner = this.pendingOwner.filter(x => x._id !== b._id);
        this.datos = this.datos.map(x => x._id === b._id ? { ...x, estatus: 'cancelada' } as RentalBooking : x);
      },
      error: (err) => console.error(err),
      complete: () => {
        this.actingIds.delete(b._id);
        this.actingAction = null;
        this.cdr.markForCheck();
      }
    });
  }

  private aplicarPaginaBase(universo: RentalBooking[]) {
    const end = this.page * this.limit;
    this.datos = universo.slice(0, end);
    this.hasMore = this.datos.length < universo.length;
    this.cdr.markForCheck();
  }

  private calcDays(a: string, b: string): number {
    const i = new Date(a).getTime();
    const f = new Date(b || a).getTime();
    const d = Math.ceil((f - i) / 86_400_000);
    return Math.max(1, d || 1);
  }

  displayUsuario(u: any): string {
    if (!u) return 'Usuario';
    if (typeof u === 'string') return u;
    return u.nombre || u.email || 'Usuario';
  }
}

async function constToast(toast: ToastController, msg: string, color: 'success' | 'danger' | 'warning' = 'success') {
  const t = await toast.create({ message: msg, duration: 1800, color });
  await t.present();
}
