import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReservaService, RentalBooking } from '../../../services/reserva.service';
import { finalize } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

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
  existingUrls: string[] = [];
  fileError = '';
  errors: string[] = [];

  loading: { booking: boolean; guardar: boolean; fotos: boolean } = {
    booking: false,
    guardar: false,
    fotos: false,
  };

  /** Vista de solo lectura si soy el solicitante (cliente) */
  viewerOnly = false;

  private readonly RUTA_LISTADO = '/mis-reservas';
  private readonly MAX_FILES = 12;
  private readonly MAX_MB_PER_FILE = 8;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservas: ReservaService,
    private cdr: ChangeDetectorRef,
    private toast: ToastController
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(pm => {
      const nuevoId = pm.get('id')!;
      if (!this.id || this.id !== nuevoId) {
        this.id = nuevoId;
        this.cargar();
      }
    });
  }

  ionViewWillEnter() {
    if (this.id) this.cargar();
  }

  ngOnDestroy(): void {
    this.revokePreviews();
  }

  /** Getter central: solo lectura si viewerOnly o si la reserva está en_curso */
  get soloLectura(): boolean {
    return this.viewerOnly || (this.booking?.estatus === 'en_curso');
  }

  /** Lee usuario actual del localStorage con varios alias de id (igual que en mis-reservas) */
  private leerUsuario(): { id: string | null } {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return { id: null };
      const u = JSON.parse(raw);
      const id = u?._id || u?.id || u?.uid || u?.userId || u?.usuarioId || null;
      return { id };
    } catch {
      return { id: null };
    }
  }

  /** Determina si el usuario actual es el solicitante de la renta (cliente) */
  private soySolicitante(b: RentalBooking): boolean {
    const me = this.leerUsuario().id;
    if (!me || !b) return false;
    const u: any = (b as any).usuario;
    if (!u) return false;
    if (typeof u === 'string') return u === me;
    const uid = u?._id || u?.id || u?.uid || u?.userId || null;
    return uid === me;
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

          // Vista sólo lectura si soy el solicitante (cliente)
          this.viewerOnly = this.soySolicitante(b);

          if (b?.checkIn?.combustible != null) this.combustible = b.checkIn.combustible;
          if (b?.checkIn?.notas) this.notas = b.checkIn.notas;

          // Normaliza fotos del backend (string o array)
          const raw = (b as any)?.checkIn?.fotos ?? [];
          let fotos: string[] = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(',') : []);
          this.existingUrls = fotos.map((u: string) => (u || '').trim()).filter(Boolean);

          this.cdr.markForCheck();
        },
        error: () => this.cdr.markForCheck()
      });
  }

  abrirSelectorFotos(fileInput: HTMLInputElement) {
    if (this.soloLectura) return;
    fileInput.click();
  }

  async onFiles(ev: Event): Promise<void> {
    if (this.soloLectura) return;

    const input = ev.target as HTMLInputElement | null;
    const list: FileList | null = input?.files ?? null;
    const arr = list ? Array.from(list) : [];

    this.fileError = '';
    this.errors = [];

    if (arr.length > this.MAX_FILES) {
      this.errors.push(`Máximo ${this.MAX_FILES} fotos.`);
    }

    const valid: File[] = [];
    for (const f of arr.slice(0, this.MAX_FILES)) {
      const isImage = f.type.startsWith('image/');
      const mb = f.size / (1024 * 1024);
      if (!isImage) this.errors.push(`"${f.name}" no es imagen.`);
      else if (mb > this.MAX_MB_PER_FILE) this.errors.push(`"${f.name}" supera ${this.MAX_MB_PER_FILE} MB.`);
      else valid.push(f);
    }

    if (this.errors.length) {
      this.fileError = this.errors.join(' ');
      this.files = [];
      this.refreshPreviews();
      this.cdr.markForCheck();
      if (input) input.value = '';
      return;
    }

    const processed: File[] = [];
    for (const f of valid) processed.push(await this.compressImageSafe(f));

    this.files = processed;
    this.refreshPreviews();
    this.cdr.markForCheck();
    if (input) input.value = '';
  }

  private refreshPreviews(): void {
    this.revokePreviews();
    this.previewUrls = (this.files || []).map(f => URL.createObjectURL(f));
  }

  private revokePreviews(): void {
    this.previewUrls.forEach(url => URL.revokeObjectURL(url));
    this.previewUrls = [];
  }

  quitarFoto(i: number): void {
    if (this.soloLectura) return;
    const arr = [...this.files];
    arr.splice(i, 1);
    this.files = arr;
    this.refreshPreviews();
    this.cdr.markForCheck();
  }

  quitarFotoExistente(i: number): void {
    if (this.soloLectura) return;
    const arr = [...this.existingUrls];
    arr.splice(i, 1);
    this.existingUrls = arr;
    this.cdr.markForCheck();
  }

  trackByUrl(i: number, url: string) { return url || i; }

  guardarDatos(): void {
    if (this.soloLectura) return;
    if (!this.booking?._id || this.fileError) return;

    this.loading.guardar = true;
    this.cdr.markForCheck();

    const payload: any = {
      fecha: new Date().toISOString(),
      combustible: this.combustible,
      notas: (this.notas ?? '').trim(),
      existentes: this.existingUrls
    };

    this.reservas
      .setCheckIn(this.booking._id, this.files, payload)
      .pipe(finalize(() => {
        this.loading.guardar = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: async (resp: { message: string; booking: RentalBooking }) => {
          this.booking = resp.booking;
          this.existingUrls = Array.isArray(resp?.booking?.checkIn?.fotos) ? [...resp.booking.checkIn.fotos] : [];
          this.files = [];
          this.refreshPreviews();

          await this.showToast('Check-in guardado');
          this.cdr.markForCheck();
        },
        error: async () => {
          await this.showToast('No se pudo guardar', 'danger');
          this.cdr.markForCheck();
        }
      });
  }

  subirFotos(): void {
    if (this.soloLectura) return;
    if (!this.booking?._id || this.files.length === 0 || this.fileError) return;

    this.loading.fotos = true;
    this.cdr.markForCheck();

    const payload: any = {
      fecha: new Date().toISOString(),
      combustible: this.combustible,
      notas: (this.notas ?? '').trim(),
      existentes: this.existingUrls
    };

    this.reservas
      .setCheckIn(this.booking._id, this.files, payload)
      .pipe(finalize(() => {
        this.loading.fotos = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: async (resp: { message: string; booking: RentalBooking }) => {
          this.booking = resp.booking;
          this.existingUrls = Array.isArray(resp?.booking?.checkIn?.fotos) ? [...resp.booking.checkIn.fotos] : [];
          this.files = [];
          this.refreshPreviews();

          await this.showToast('Fotos subidas');
          this.cdr.markForCheck();
        },
        error: async () => {
          await this.showToast('No se pudieron subir las fotos', 'danger');
          this.cdr.markForCheck();
        }
      });
  }

  getRentalCar(b: any) {
    const rc = b?.rentalCar;
    return rc && typeof rc === 'object' ? rc : null;
  }

  guardarYSalir(): void {
    if (this.soloLectura) { this.continuar(); return; }
    if (!this.booking?._id || this.fileError) return;

    this.loading.guardar = true;
    this.cdr.markForCheck();

    const payload: any = {
      fecha: new Date().toISOString(),
      combustible: this.combustible,
      notas: (this.notas ?? '').trim(),
      existentes: this.existingUrls
    };

    this.reservas
      .setCheckIn(this.booking._id, this.files, payload)
      .pipe(finalize(() => {
        this.loading.guardar = false;
        this.loading.fotos = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: async (resp: { message: string; booking: RentalBooking }) => {
          this.booking = resp.booking;
          await this.showToast('Check-in guardado');
          this.router.navigate([this.RUTA_LISTADO], {
            queryParams: { refresh: '1' },
            replaceUrl: true
          });
        },
        error: async () => {
          await this.showToast('No se pudo guardar', 'danger');
          this.cdr.markForCheck();
        }
      });
  }

  continuar(): void {
    this.router.navigate([this.RUTA_LISTADO]);
  }

  get hayCambios(): boolean {
    if (this.soloLectura) return false;
    const baseComb = (this.booking?.checkIn?.combustible ?? 100);
    const baseNotas = (this.booking?.checkIn?.notas ?? '').trim();
    const baseFotos = Array.isArray(this.booking?.checkIn?.fotos) ? this.booking!.checkIn!.fotos : [];
    const existentesCambiaron = !this.arraysIguales(this.existingUrls, baseFotos);

    return (this.combustible !== baseComb) ||
      ((this.notas ?? '').trim() !== baseNotas) ||
      this.files.length > 0 ||
      existentesCambiaron;
  }

  private arraysIguales(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const A = [...a].sort(); const B = [...b].sort();
    return A.every((v, i) => v === B[i]);
  }

  async tomarFotoCapacitor() {
    if (this.soloLectura) return;
    if (!Capacitor.isNativePlatform()) return;
    const photo = await Camera.getPhoto({
      quality: 70,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera
    });
    const resp = await fetch(photo.webPath!);
    const blob = await resp.blob();
    const file = new File([blob], `foto_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
    const nuevos = [...this.files, file].slice(0, this.MAX_FILES);
    const processed: File[] = [];
    for (const f of nuevos) processed.push(await this.compressImageSafe(f));
    this.files = processed;
    this.refreshPreviews();
    this.cdr.markForCheck();
  }

  private async compressImageSafe(file: File, maxW = 1600, maxH = 1600, quality = 0.7): Promise<File> {
    try {
      return await this.compressImage(file, maxW, maxH, quality);
    } catch {
      return file;
    }
  }

  private async compressImage(file: File, maxW = 1600, maxH = 1600, quality = 0.7): Promise<File> {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
    const w = Math.round(bitmap.width * ratio);
    const h = Math.round(bitmap.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', quality));
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
  }

  private async showToast(msg: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const t = await this.toast.create({ message: msg, duration: 1800, color });
    await t.present();
  }
}
