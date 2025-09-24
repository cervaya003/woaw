import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReservaService, RentalBooking } from '../../../services/reserva.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class CheckoutPage implements OnInit {
  id!: string;
  booking?: RentalBooking;

  combustible = 100;
  notas = '';
  files: File[] = [];

  loading: { booking: boolean; guardar: boolean; fotos: boolean } = {
    booking: false,
    guardar: false,
    fotos: false,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservas: ReservaService,
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.cargar();
  }

  private cargar(): void {
    this.loading.booking = true;
    this.reservas.getBookingById(this.id)
      .pipe(finalize(() => (this.loading.booking = false)))
      .subscribe((b: RentalBooking) => {
        this.booking = b;
        // Si ya había checkOut, precarga
        if (b.checkOut?.combustible != null) this.combustible = b.checkOut.combustible;
        if (b.checkOut?.notas) this.notas = b.checkOut.notas;
      });
  }

  onFiles(ev: Event): void {
    const input = ev.target as HTMLInputElement | null;
    const list: FileList | null = input?.files ?? null;
    this.files = list ? Array.from(list) : [];
  }

  guardarDatos(): void {
    if (!this.booking?._id) return;

    this.loading.guardar = true;
    this.reservas
      .updateBookingPartial(this.booking._id, {
        checkOut: {
          fecha: new Date().toISOString(),
          combustible: this.combustible,
          notas: this.notas,
        },
      })
      .pipe(finalize(() => (this.loading.guardar = false)))
      .subscribe((resp: { message: string; booking: RentalBooking }) => {
        this.booking = resp.booking;
        // TODO: toast OK
      });
  }

  subirFotos(): void {
    if (!this.booking?._id || this.files.length === 0) return;

    this.loading.fotos = true;
    this.reservas
      .setCheckOut(this.booking._id, this.files)
      .pipe(finalize(() => (this.loading.fotos = false)))
      .subscribe((resp: { message: string; booking: RentalBooking }) => {
        this.booking = resp.booking;
        // TODO: toast OK
      });
  }

  terminar(): void {
    // Ajusta a tu ruta real de detalle
    this.router.navigate(['/reservas', this.booking?._id]);
  }
}
