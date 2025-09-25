import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReservaService, RentalBooking } from '../../../services/reserva.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-checkin',
  templateUrl: './checkin.page.html',
  styleUrls: ['./checkin.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class CheckInPage implements OnInit, OnDestroy {
  id!: string;
  booking?: RentalBooking;

  combustible = 100;
  notas = '';
  files: File[] = [];

  previewUrls: string[] = [];
  fileError = '';

  loading: { booking: boolean; guardar: boolean; fotos: boolean } = {
    booking: false,
    guardar: false,
    fotos: false,
  };

  private readonly RUTA_LISTADO = '/mis-reservas';

  private readonly MAX_FILES = 12;
  private readonly MAX_MB_PER_FILE = 8;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservas: ReservaService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.cargar();
  }

  ngOnDestroy(): void {
    this.revokePreviews();
  }

  private cargar(): void {
    this.loading.booking = true;
    this.cdr.markForCheck();

    this.reservas
      .getBookingById(this.id)
      .pipe(finalize(() => {
        this.loading.booking = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (b: RentalBooking) => {
          this.booking = b;
          if (b?.checkIn?.combustible != null) this.combustible = b.checkIn.combustible;
          if (b?.checkIn?.notas) this.notas = b.checkIn.notas;
          this.cdr.markForCheck();
        },
        error: () => this.cdr.markForCheck()
      });
  }

  abrirSelectorFotos(fileInput: HTMLInputElement) {
    fileInput.click();
  }

  onFiles(ev: Event): void {
    const input = ev.target as HTMLInputElement | null;
    const list: FileList | null = input?.files ?? null;
    const arr = list ? Array.from(list) : [];

    this.fileError = '';

    if (arr.length > this.MAX_FILES) {
      this.fileError = `Máximo ${this.MAX_FILES} fotos.`;
    }

    const valid: File[] = [];
    for (const f of arr.slice(0, this.MAX_FILES)) {
      const isImage = f.type.startsWith('image/');
      const mb = f.size / (1024 * 1024);
      if (!isImage) {
        this.fileError = 'Solo se permiten imágenes.';
        continue;
      }
      if (mb > this.MAX_MB_PER_FILE) {
        this.fileError = `Cada foto debe pesar ≤ ${this.MAX_MB_PER_FILE} MB.`;
        continue;
      }
      valid.push(f);
    }

    this.files = valid;
    this.refreshPreviews();
    this.cdr.markForCheck();
  }

  private refreshPreviews(): void {
    this.revokePreviews();
    this.previewUrls = (this.files || []).map(f => URL.createObjectURL(f));
  }

  private revokePreviews(): void {
    this.previewUrls.forEach(url => URL.revokeObjectURL(url));
    this.previewUrls = [];
  }

  trackByUrl(_i: number, url: string) { return url; }

  /** Guarda datos (y fotos si hay) en un solo request multipart */
  guardarDatos(): void {
    if (!this.booking?._id) return;

    this.loading.guardar = true;
    this.cdr.markForCheck();

    const payload = {
      fecha: new Date().toISOString(),
      combustible: this.combustible,
      notas: (this.notas ?? '').trim(),
      // Si quieres preservar fotos previas guardadas en la BD:
      // existentes: this.booking?.checkIn?.fotos ?? []
    };

    this.reservas
      .setCheckIn(this.booking._id, this.files, payload)
      .pipe(finalize(() => {
        this.loading.guardar = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (resp: { message: string; booking: RentalBooking }) => {
          this.booking = resp.booking;
          this.cdr.markForCheck();
        },
        error: () => this.cdr.markForCheck()
      });
  }

  /** Sube fotos pero también manda notas/combustible para que no se pierdan */
  subirFotos(): void {
    if (!this.booking?._id || this.files.length === 0) return;

    this.loading.fotos = true;
    this.cdr.markForCheck();

    const payload = {
      fecha: new Date().toISOString(),
      combustible: this.combustible,
      notas: (this.notas ?? '').trim(),
      // existentes: this.booking?.checkIn?.fotos ?? []
    };

    this.reservas
      .setCheckIn(this.booking._id, this.files, payload)
      .pipe(finalize(() => {
        this.loading.fotos = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (resp: { message: string; booking: RentalBooking }) => {
          this.booking = resp.booking;
          this.cdr.markForCheck();
        },
        error: () => this.cdr.markForCheck()
      });
  }

  getRentalCar(b: any) {
    const rc = b?.rentalCar;
    return rc && typeof rc === 'object' ? rc : null;
  }

  /** Guarda todo y vuelve al listado */
  guardarYSalir(): void {
    if (!this.booking?._id) return;

    this.loading.guardar = true;
    this.cdr.markForCheck();

    const payload = {
      fecha: new Date().toISOString(),
      combustible: this.combustible,
      notas: (this.notas ?? '').trim(),
      // existentes: this.booking?.checkIn?.fotos ?? []
    };

    this.reservas
      .setCheckIn(this.booking._id, this.files, payload)
      .pipe(finalize(() => {
        this.loading.guardar = false;
        this.loading.fotos = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (resp: { message: string; booking: RentalBooking }) => {
          this.booking = resp.booking;
          this.router.navigate([this.RUTA_LISTADO]);
        },
        error: () => this.cdr.markForCheck()
      });
  }

  continuar(): void {
    this.router.navigate([this.RUTA_LISTADO]);
  }
}
