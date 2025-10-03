import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { IonicModule, ModalController, ToastController, AlertController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { of, EMPTY, concat } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';

import { RentaService } from '../../services/renta.service';
import { ReservaService, RentalBooking } from '../../services/reserva.service';

@Component({
  selector: 'app-detalle-reserva-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './detalle-reserva-modal.component.html',
  styleUrls: ['./detalle-reserva-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetalleReservaModalComponent implements OnInit {
  @Input() booking?: RentalBooking | null;
  @Input() bookingId?: string | null;
  @Input() viewerOnly = false;

  @Output() updated = new EventEmitter<RentalBooking>();
  @Output() closed = new EventEmitter<void>();

  loading = true;
  loadingCar = false;

  data!: RentalBooking;
  car: any | null = null;

  /** nombre resuelto del propietario (si logramos fetch) */
  private ownerNameResolved: string | null = null;

  private myUserId: string | null = null;

  constructor(
    private reservas: ReservaService,
    private renta: RentaService,
    private modalCtrl: ModalController,
    private cdr: ChangeDetectorRef,
    private toast: ToastController,
    private alert: AlertController,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    const me = this.leerUsuario();
    this.myUserId = me.id;

    if (this.booking) {
      this.data = this.booking;
      this.loading = false;
      this.cdr.markForCheck();
      this.ensureCarLoaded();
    } else if (this.bookingId) {
      this.fetchBooking(this.bookingId);
    } else {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  // ───────── CARGA PRINCIPAL ─────────
  private async fetchBooking(id: string) {
    this.loading = true; this.cdr.markForCheck();
    this.reservas.getBookingById(id).subscribe({
      next: (bk) => {
        this.data = bk;
        this.loading = false;
        this.cdr.markForCheck();
        this.ensureCarLoaded();
      },
      error: async () => {
        this.loading = false;
        this.cdr.markForCheck();
        await this.toastMsg('No se pudo cargar la reserva', 'danger');
        this.dismiss();
      }
    });
  }

  private ensureCarLoaded() {
    const rc: any = this.data?.rentalCar;
    if (!rc) { this.car = null; return; }

    if (typeof rc === 'object') {
      this.car = rc;
      this.cdr.markForCheck();
      this.tryResolveOwnerNameFromCar();
      return;
    }

    // rentalCar es un ObjectId → trae el coche y luego resolvemos propietario
    this.loadingCar = true; this.cdr.markForCheck();
    this.renta.cochePorId(String(rc)).subscribe({
      next: (car) => {
        this.car = car;
        this.loadingCar = false;
        this.cdr.markForCheck();
        this.tryResolveOwnerNameFromCar();
      },
      error: () => {
        this.loadingCar = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ───────── RESOLVER PROPIETARIO (fetch extra) ─────────
  /**
   * Intenta obtener el nombre del propietario:
   * - Lee propietarioId/ownerId/usuarioId/createdBy en el coche.
   * - Si es string (parece ObjectId), hace GET contra rutas tolerantes.
   * - Si responde, guarda nombre en `ownerNameResolved`.
   */
  private tryResolveOwnerNameFromCar() {
    const id = this.extractOwnerId(this.car);
    if (!id || typeof id !== 'string') return;

    // Evita tratar como nombre un ObjectId
    if (!this.looksLikeObjectId(id) && id.trim().length > 0) {
      this.ownerNameResolved = id.trim();
      this.cdr.markForCheck();
      return;
    }

    this.fetchOwnerNameById(id).subscribe({
      next: (name) => {
        this.ownerNameResolved = name || null;
        this.cdr.markForCheck();
      },
      error: () => {
        // Silencioso: mantenemos fallbacks
      }
    });
  }

  /** Extrae el ID del propietario de varios alias */
  private extractOwnerId(rc: any): string | null {
    if (!rc) return null;
    const candidates = [
      rc?.propietarioId, rc?.ownerId, rc?.ownerID,
      rc?.usuarioId, rc?.userId,
      rc?.createdBy, rc?.creadoPor
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().length) return c.trim();
      if (c && typeof c === 'object' && typeof c._id === 'string') return c._id;
    }
    return null;
  }

  /** Heurística simple de ObjectId/UUID largo */
  private looksLikeObjectId(s: string): boolean {
    if (!s) return false;
    if (/^[a-f0-9]{24}$/i.test(s)) return true;      // ObjectId
    if (/^[a-f0-9-]{32,}$/i.test(s)) return true;   // uuid/ids largos
    return false;
  }

  /** Headers con token (si existe) */
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    let h = new HttpHeaders({ 'Accept': 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  /** Genera rutas tolerantes para /users/:id, /usuario/:id con y sin /api */
  private buildUserPathCandidates(id: string): string[] {
    const base = (this.reservas.baseUrl || '').replace(/\/+$/, '');
    const hasApi = /\/api$/.test(base);
    const basePrimary = base;
    const baseAlt = hasApi ? base.replace(/\/api$/, '') : `${base}/api`;

    const paths = [
      `/users/${id}`,
      `/usuario/${id}`,
      `/user/${id}`,
      `/usuarios/${id}`,
      `/auth/users/${id}`
    ];

    const set = new Set<string>();
    for (const p of paths) {
      const path = p.startsWith('/') ? p : `/${p}`;
      set.add(`${basePrimary}${path}`);
      set.add(`${baseAlt}${path}`);
    }
    return Array.from(set.values());
  }

  /** Intenta múltiples endpoints y devuelve el nombre si lo encuentra */
  private fetchOwnerNameById(id: string) {
    const urls = this.buildUserPathCandidates(id);
    const headers = this.authHeaders();

    const attempts = urls.map(u =>
      this.http.get<any>(u, { headers }).pipe(
        map((res) => {
          // normaliza varias formas de payload
          const obj =
            res?.user || res?.usuario || res?.data || res?.owner || res || null;
          const name =
            obj?.nombre || obj?.name || obj?.displayName || obj?.fullName ||
            obj?.alias || obj?.username || obj?.email || null;
          return (typeof name === 'string' && name.trim().length)
            ? name.trim()
            : null;
        }),
        catchError(() => of(null))
      )
    );

    // concat -> primer éxito no nulo
    return concat(...attempts).pipe(
      switchMap(v => v ? of(v) : EMPTY),
      take(1),
      catchError(() => of(null))
    );
  }

  // ───────── Helpers UI / lógica existente ─────────
  private leerUsuario(): { id: string | null } {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return { id: null };
      const u = JSON.parse(raw);
      const id = u?._id || u?.id || u?.uid || u?.userId || u?.usuarioId || null;
      return { id };
    } catch { return { id: null }; }
  }

  private meName(): string | null {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const u = JSON.parse(raw) || {};
      const name = u.nombre || u.name || u.displayName || u.fullName || u.alias || u.username || u.email;
      return (typeof name === 'string' && name.trim().length) ? name.trim() : null;
    } catch { return null; }
  }

  soyPropietario(): boolean {
    if (!this.myUserId || !this.data) return false;
    const directOwner = (this.data as any)?.rentalCarOwnerId || (this.data as any)?.propietarioId || (this.data as any)?.ownerId;
    if (typeof directOwner === 'string') return directOwner === this.myUserId;

    const rc: any = (this.data as any)?.rentalCar;
    if (!rc) return false;
    if (typeof rc === 'string') return true;

    const owner =
      rc.owner || rc.ownerId || rc.ownerID || rc.dueno || rc.propietario || rc.propietarioId || rc.propietarioID ||
      rc.user || rc.usuario || rc.userId || rc.usuarioId || rc.createdBy || rc.creadoPor;
    if (typeof owner === 'string') return owner === this.myUserId;
    if (owner && typeof owner === 'object') {
      const oid = owner?._id || owner?.id || owner?.uid || owner?.userId || owner?.usuarioId || null;
      return oid === this.myUserId;
    }
    if (typeof rc?.propietarioId === 'string') return rc.propietarioId === this.myUserId;
    if (typeof rc?.ownerId === 'string') return rc.ownerId === this.myUserId;
    return false;
  }

  private normalizarFechaLocalISO(d: string | Date): string {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  esHoy(fecha: string | Date): boolean {
    const hoy = this.normalizarFechaLocalISO(new Date());
    const f = this.normalizarFechaLocalISO(fecha);
    return hoy === f;
  }
  tieneCheckIn(): boolean {
    const ci: any = (this.data as any)?.checkIn;
    if (!ci) return false;
    return !!(
      (ci.combustible != null) ||
      (typeof ci.notas === 'string' && ci.notas.trim().length > 0) ||
      (Array.isArray(ci.fotos) && ci.fotos.length > 0) ||
      Boolean(ci.fecha)
    );
  }

  // Color del badge
  badgeColor(s?: RentalBooking['estatus'] | null): string {
    switch (s) {
      case 'pendiente': return 'medium';
      case 'aceptada': return 'primary';
      case 'en_curso': return 'warning';
      case 'finalizada': return 'success';
      case 'cancelada': return 'danger';
      default: return 'medium';
    }
  }

  // ====== Nombre del propietario para el template ======
  private pickNameLoose(x: any): string | null {
    if (!x) return null;
    if (typeof x === 'string') {
      if (this.looksLikeObjectId(x)) return null;
      const s = x.trim();
      return s.length ? s : null;
    }
    const cands = [
      x.nombre, x.name, x.displayName, x.fullName, x.razonSocial, x.razon_social,
      x.username, x.alias, x.nick, x.email
    ].filter(Boolean);
    for (const c of cands) {
      if (typeof c === 'string' && !this.looksLikeObjectId(c)) {
        const s = c.trim();
        if (s.length) return s;
      }
    }
    return null;
  }

  private shortId(x: any): string | null {
    const s = typeof x === 'string' ? x : null;
    if (!s) return null;
    if (this.looksLikeObjectId(s)) return `#${s.slice(0, 6)}`;
    if (s.length >= 12) return `#${s.slice(0, 6)}`;
    return null;
  }

  ownerNombre(): string {
    // 0) Si ya resolvimos por fetch, úsalo
    if (this.ownerNameResolved) return this.ownerNameResolved;

    const bk: any = this.data || {};
    const rcFromBk: any = bk.rentalCar;
    const rc: any = this.car || (typeof rcFromBk === 'object' ? rcFromBk : null);

    // 1) Campos sueltos legibles
    const looseList = [
      bk.rentalCarOwnerName, bk.ownerName, bk.propietarioNombre,
      rc?.ownerName, rc?.propietarioNombre, rc?.duenoNombre,
      rc?.ownerAlias, rc?.propietarioAlias
    ];
    for (const l of looseList) {
      const picked = this.pickNameLoose(l);
      if (picked) return picked;
    }

    // 2) Objetos típicos
    const possObjs = [
      rc?.owner, rc?.propietario, rc?.dueno, rc?.user, rc?.usuario,
      rc?.createdBy, rc?.creadoPor,
      bk?.rentalCarOwner, bk?.propietario, bk?.owner
    ];
    for (const obj of possObjs) {
      const picked = this.pickNameLoose(obj);
      if (picked) return picked;
    }

    // 3) IDs → alias corto
    const possIds = [
      bk.rentalCarOwnerId, bk.propietarioId, bk.ownerId,
      rc?.ownerId, rc?.ownerID, rc?.propietarioId, rc?.propietarioID,
      rc?.usuarioId, rc?.userId
    ];
    for (const id of possIds) {
      const name = this.pickNameLoose(id) || this.shortId(id);
      if (name) return name;
    }

    // 4) Arrays raros
    const weird = rc?.owners || rc?.propietarios || rc?.usuarios;
    if (Array.isArray(weird) && weird.length) {
      for (const o of weird) {
        const picked = this.pickNameLoose(o) || this.shortId(o);
        if (picked) return picked;
      }
    }

    // 5) Si eres el dueño logueado
    if (this.soyPropietario()) {
      const me = this.meName();
      if (me) return me;
      return 'Tú';
    }

    // Último fallback
    return '—';
  }

  // ====== UI helpers ======
  currency(): string {
    return this.data?.moneda || 'MXN';
  }

  dias(): number {
    const i = new Date(this.data?.fechaInicio || new Date()).getTime();
    const f = new Date(this.data?.fechaFin || this.data?.fechaInicio || new Date()).getTime();
    const d = Math.ceil((f - i) / 86_400_000);
    return Math.max(1, d || 1);
  }

  marcaModelo(): string {
    const c: any = this.car || (typeof (this.data as any).rentalCar === 'object' ? (this.data as any).rentalCar : null);
    if (!c) return 'Auto';
    return [c.marca, c.modelo, c.anio].filter(Boolean).join(' ');
  }

  async toastMsg(message: string, color: 'success' | 'danger' | 'warning' | 'medium' = 'success') {
    const t = await this.toast.create({ message, duration: 1600, color });
    await t.present();
  }

  async dismiss() {
    this.closed.emit();
    await this.modalCtrl.dismiss();
  }
}
