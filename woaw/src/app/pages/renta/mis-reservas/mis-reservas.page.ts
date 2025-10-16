import { Component, ChangeDetectionStrategy, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ReservaService, RentalBooking } from '../../../services/reserva.service';
import { finalize, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { DetalleReservaModalComponent } from '../../../components/detalle-reserva-modal/detalle-reserva-modal.component';

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
    private toast: ToastController,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController // <-- para confirmar cancelación
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

    // --- RESERVAS A MIS COCHES (solo si tengo myUserId) ---
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
      ownerId: this.myUserId,
      rentalCarOwnerId: this.myUserId,
      owner: this.myUserId,
      propietarioId: this.myUserId,
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
          const seguros = owners.filter(b => {
            const rc: any = (b as any)?.rentalCar;
            if (typeof rc === 'string') return true;
            if (!rc) return false;
            return this.soyPropietarioDeAuto(b);
          });

        this.ownerAll = (seguros || []).sort(this.sortBookingDesc);
        this.ownerAllLoaded = true;
      }

      this.pendingOwner = this.ownerAll
        .filter(b => b?.estatus === 'pendiente')
        .map(b => ({ ...b, dias: this.calcDays(b.fechaInicio, b.fechaFin) }));

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

    const directOwner = (b as any)?.rentalCarOwnerId || (b as any)?.propietarioId;
    if (typeof directOwner === 'string' && directOwner) return directOwner === this.myUserId;

    const rc: any = (b as any)?.rentalCar;
    if (rc && typeof rc === 'object') {
      const owner =
        rc.owner || rc.ownerId || rc.dueno || rc.propietario || rc.propietarioId || rc.user || rc.usuario;

      if (typeof owner === 'string') return owner === this.myUserId;

      if (owner && typeof owner === 'object') {
        const oid = owner?._id || owner?.id || owner?.uid || owner?.userId || null;
        if (oid) return oid === this.myUserId;
      }

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

  /** ====== Helpers fecha ====== */
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

  /** === NUEVOS helpers para comparar contra hoy (por día, local) === */
  private isSameDayAsToday(fecha: string | Date): boolean {
    const hoy = this.normalizarFechaLocalISO(new Date());
    const f = this.normalizarFechaLocalISO(fecha);
    return f === hoy;
  }
  private isAfterToday(fecha: string | Date): boolean {
    const hoy = this.normalizarFechaLocalISO(new Date());
    const f = this.normalizarFechaLocalISO(fecha);
    return f > hoy;
  }
  private isBeforeToday(fecha: string | Date): boolean {
    const hoy = this.normalizarFechaLocalISO(new Date());
    const f = this.normalizarFechaLocalISO(fecha);
    return f < hoy;
  }

  public puedeIniciar(b: RentalBooking): boolean {
    return this.soyPropietarioDeAuto(b)
      && b?.estatus === 'aceptada'
      && this.esHoy(b?.fechaInicio as any)
      && this.tieneCheckIn(b);
  }

  /** ✅ Finalizar si soy dueño y está en curso */
  public puedeFinalizar(b: RentalBooking): boolean {
    return this.soyPropietarioDeAuto(b)
      && b?.estatus === 'en_curso';
  }

  /** ✅ Reglas para mostrar botón Cancelar (dueño o usuario) */
  public puedeCancelar(b: RentalBooking): boolean {
    if (!b) return false;

    const est = b.estatus;
    const soyOwner = this.soyPropietarioDeAuto(b);
    const soyCliente = this.esSolicitante(b);
    if (!soyOwner && !soyCliente) return false;

    // PENDIENTE: ambos pueden cancelar
    if (est === 'pendiente') return true;

    // ACEPTADA:
    // - Antes del inicio o el mismo día: pueden cancelar dueño o solicitante
    // - Si ya pasó la fecha de inicio: sólo el dueño
    if (est === 'aceptada') {
      if (this.isAfterToday(b.fechaInicio) || this.isSameDayAsToday(b.fechaInicio)) {
        return true; // ambos
      }
      return soyOwner; // ya pasó el inicio -> sólo dueño
    }

    // EN_CURSO: sólo el dueño
    if (est === 'en_curso') {
      return soyOwner;
    }

    // FINALIZADA / CANCELADA u otras: no
    return false;
  }

  async iniciarRenta(b: RentalBooking) {
    if (!b?._id) return;

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

  /** ⛳ Navega al Checkout (no cambia estatus aquí) */
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

  async openDetalle(b: RentalBooking): Promise<void> {
    // 🔴 Cambiamos: pasamos sólo el ID para que el componente haga su fetch populate
    const modal = await this.modalCtrl.create({
      component: DetalleReservaModalComponent,
      componentProps: {
        bookingId: b._id,                          // ← fuerza al modal a pedir /booking/bookings/:id (populate)
        viewerOnly: !this.soyPropietarioDeAuto(b)
      },
      canDismiss: true,
      showBackdrop: true,
      breakpoints: [0, 0.6, 0.92],
      initialBreakpoint: 0.92
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.updated) {
      const updated: RentalBooking = data.updated;
      const patch = (x: RentalBooking) => x._id === updated._id ? updated : x;

      this.ownerAll = this.ownerAll.map(patch);
      this.myAll = this.myAll.map(patch);
      this.mergedAll = this.mergedAll.map(patch);
      this.datos = this.datos.map(patch);

      this.cdr.markForCheck();
    }
  }

  acceptPending(b: RentalBooking) {
    if (!b?._id) return;
    this.actingAction = 'accept';
    this.actingIds.add(b._id);
    this.cdr.markForCheck();

    this.reservas.acceptBooking(b._id).subscribe({
      next: () => {
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

  async cancelar(b: RentalBooking) {
    if (!b?._id) return;
    if (!this.puedeCancelar(b)) {
      let motivo = 'No puedes cancelar esta reserva';
      if (b.estatus === 'en_curso') motivo = 'Sólo el propietario puede cancelar una renta en curso';
      await constToast(this.toast, motivo, 'warning');
      return;
    }

    const soyOwner = this.soyPropietarioDeAuto(b);
    const soyCliente = this.esSolicitante(b);

    const header = 'Cancelar reserva';
    const msg = `¿Deseas cancelar la reserva #${b.codigo || b._id}?`;
    const btnOk = 'Cancelar';
    const motivo = soyOwner ? 'Cancelada por propietario' : (soyCliente ? 'Cancelada por cliente' : 'Cancelada');

    const alert = await this.alertCtrl.create({
      header,
      message: msg,
      buttons: [
        { text: 'No', role: 'cancel' },
        { text: btnOk, role: 'destructive' }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;

    this.actingAction = 'cancel';
    this.actingIds.add(b._id);
    this.cdr.markForCheck();

    this.reservas.cancelBooking(b._id, motivo).subscribe({
      next: async () => {
        const patch = (x: RentalBooking) => x._id === b._id ? ({ ...x, estatus: 'cancelada' } as RentalBooking) : x;

        this.ownerAll = this.ownerAll.map(patch);
        this.myAll = this.myAll.map(patch);
        this.mergedAll = this.mergedAll.map(patch);
        this.datos = this.datos.map(patch);
        this.pendingOwner = this.pendingOwner.filter(x => x._id !== b._id);

        await constToast(this.toast, 'Reserva cancelada', 'success');
      },
      error: async () => {
        await constToast(this.toast, 'No se pudo cancelar la reserva', 'danger');
      },
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
