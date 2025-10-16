import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
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
  @Input() booking?: RentalBooking | null;   // si te la pasan ya poblada, la usas tal cual
  @Input() bookingId?: string | null;        // si te pasan el ID, la pides al backend (que ya la popula)
  @Input() viewerOnly = false;
  @Output() updated = new EventEmitter<RentalBooking>();
  @Output() closed = new EventEmitter<void>();

  loading = true;
  data!: RentalBooking;          // vendrá con usuario y rentalCar.propietarioId poblados
  car: any | null = null;        // atajo a data.rentalCar

  // Para saber “quién soy” (opcional, por si lo ocupas en la vista)
  private myUserId: string | null = null;

  constructor(
    private reservas: ReservaService,
    private modalCtrl: ModalController,
    private cdr: ChangeDetectorRef,
    private toast: ToastController,
  ) {}

  ngOnInit(): void {
    this.myUserId = this.leerUsuarioId();

    if (this.booking) {
      // Si ya viene poblada desde fuera, úsala tal cual
      this.data = this.booking;
      this.car = (this.data as any)?.rentalCar ?? null;
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    if (this.bookingId) {
      // Pide la reserva al backend (tu endpoint ya hace populate)
      this.fetchBookingPopulada(this.bookingId);
      return;
    }

    // Fallback (no debería pasar)
    this.loading = false;
    this.cdr.markForCheck();
  }

  /** Pide la reserva por id a tu endpoint que ya devuelve usuario y propietario poblados */
  private fetchBookingPopulada(id: string) {
    this.loading = true; this.cdr.markForCheck();
    this.reservas.getBookingById(id).subscribe({
      next: (bk) => {
        // bk ya viene con:
        // - bk.usuario = { _id, nombre, email }
        // - bk.rentalCar.propietarioId = { _id, nombre, email }
        this.data = bk;
        this.car = (bk as any)?.rentalCar ?? null;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: async () => {
        this.loading = false;
        this.cdr.markForCheck();
        await this.toastMsg('No se pudo cargar la reserva', 'danger');
        this.dismiss();
      }
    });
  }

  // ========== Getters de nombres: SOLO leen lo que YA VIENE poblado ==========
  clienteNombre(): string {
    const u: any = (this.data as any)?.usuario;
    if (!u) return 'Cliente';

    if (typeof u === 'object') {
      return (u.nombre?.trim()) || (u.email?.trim()) || 'Cliente';
    }

    // Si llega string (id sin poblar), mostramos un short id de cortesía
    if (typeof u === 'string') {
      return this.shortId(u) || 'Cliente';
    }

    return 'Cliente';
  }

  ownerNombre(): string {
    // Prioriza el propietario poblado en rentalCar.propietarioId
    const rc: any = (this.data as any)?.rentalCar;
    const p = rc?.propietarioId;

    if (p && typeof p === 'object') {
      return (p.nombre?.trim()) || (p.email?.trim()) || '—';
    }
    if (typeof p === 'string') {
      return this.shortId(p) || '—';
    }

    // Alternativas por si tu API usa otro nombre de campo
    const alt = (this.data as any)?.rentalCarOwner || (this.data as any)?.propietario;
    if (alt && typeof alt === 'object') {
      return (alt.nombre?.trim()) || (alt.email?.trim()) || '—';
    }
    if (typeof alt === 'string') {
      return this.shortId(alt) || '—';
    }

    return '—';
  }

  // ========== Miscelánea ==========
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
    const c: any = this.car;
    if (!c) return 'Auto';
    return [c.marca, c.modelo, c.anio].filter(Boolean).join(' ');
  }

  private leerUsuarioId(): string | null {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const u = JSON.parse(raw);
      return u?._id || u?.id || u?.uid || u?.userId || u?.usuarioId || null;
    } catch { return null; }
  }

  private shortId(s: string): string | null {
    if (typeof s !== 'string') return null;
    if (s.length >= 6) return `#${s.slice(0, 6)}`;
    return s || null;
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
