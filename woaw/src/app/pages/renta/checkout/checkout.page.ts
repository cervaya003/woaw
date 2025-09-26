import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReservaService, RentalBooking } from '../../../services/reserva.service';
import { finalize } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';


@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})

export class CheckOutPage implements OnInit, OnDestroy {
  id!: string;
  booking?: RentalBooking;

  // Campos de Checkout
  combustible = 100;
  notas = '';

  // Fotos
  files: File[] = [];
  previewUrls: string[] = [];
  existingUrls: string[] = [];
  fileError = '';
  errors: string[] = [];

  loading: { booking: boolean; fotos: boolean; finalizar: boolean } = {
    booking: false,
    fotos: false,
    finalizar: false,
  };

  /** Vista solo lectura si soy solicitante o si ya está finalizada */
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

  /** Solo lectura si soy cliente o si ya está finalizada */
  get soloLectura(): boolean {
    return this.viewerOnly || (this.booking?.estatus === 'finalizada');
  }

  /** ===== Helpers de usuario/rol ===== */
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

          // Solo lectura si soy el solicitante (cliente)
          this.viewerOnly = this.soySolicitante(b);

          // Prefill desde checkOut (si ya hay)
          if (b?.checkOut?.combustible != null) this.combustible = b.checkOut.combustible;
          if (b?.checkOut?.notas) this.notas = b.checkOut.notas;

          // Normaliza fotos checkOut (solo mostramos; no hay eliminar en API)
          const raw = (b as any)?.checkOut?.fotos ?? [];
          const fotos: string[] = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(',') : []);
          this.existingUrls = fotos.map((u: string) => (u || '').trim()).filter(Boolean);

          this.cdr.markForCheck();
        },
        error: () => this.cdr.markForCheck()
      });
  }

  getRentalCar(b: any) {
    const rc = b?.rentalCar;
    return rc && typeof rc === 'object' ? rc : null;
  }

  /** ====== Fotos nuevas (no se pueden borrar existentes en checkout) ====== */
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

  quitarFotoNueva(i: number): void {
    if (this.soloLectura) return;
    const arr = [...this.files];
    arr.splice(i, 1);
    this.files = arr;
    this.refreshPreviews();
    this.cdr.markForCheck();
  }

  trackByUrl(i: number, url: string) { return url || i; }

  /** Subir solo fotos nuevas (no finaliza) */
  subirFotos(): void {
    if (this.soloLectura) return;
    if (!this.booking?._id || this.files.length === 0 || this.fileError) return;

    this.loading.fotos = true;
    this.cdr.markForCheck();

    this.reservas
      .setCheckOut(this.booking._id, this.files)
      .pipe(finalize(() => {
        this.loading.fotos = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: async (resp: { message: string; booking: RentalBooking }) => {
          this.booking = resp.booking;
          // refrescamos existentes desde resp
          const raw = (resp?.booking as any)?.checkOut?.fotos ?? [];
          const fotos: string[] = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(',') : []);
          this.existingUrls = fotos.map((u: string) => (u || '').trim()).filter(Boolean);

          this.files = [];
          this.refreshPreviews();
          await this.showToast('Fotos de check-out subidas');
        },
        error: async () => {
          await this.showToast('No se pudieron subir las fotos', 'danger');
        }
      });
  }

  /** Guardar datos + finalizar (cambia a "finalizada") */
  async guardarYFinalizar(): Promise<void> {
    if (this.soloLectura) return;
    if (!this.booking?._id || this.fileError) return;

    this.loading.finalizar = true;
    this.cdr.markForCheck();

    try {
      // 1) Enviar TODO del checkout en un solo request: datos + (opcional) fotos nuevas
      const payload = {
        fecha: new Date().toISOString(),
        combustible: this.combustible,
        notas: (this.notas ?? '').trim(),
        // existentes: this.existingUrls, // solo si tu backend lo soporta
      };

      await new Promise<void>((resolve, reject) => {
        this.reservas.setCheckOut(this.booking!._id, this.files, payload).subscribe({
          next: (resp) => {
            this.booking = resp.booking;

            // refrescar existentes desde resp
            const raw = (resp?.booking as any)?.checkOut?.fotos ?? [];
            const fotos: string[] = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(',') : []);
            this.existingUrls = fotos.map((u: string) => (u || '').trim()).filter(Boolean);

            resolve();
          },
          error: reject,
        });
      });

      // 2) Cambiar estatus a finalizada
      await new Promise<void>((resolve, reject) => {
        this.reservas.finishBooking(this.booking!._id).subscribe({
          next: (resp) => { this.booking = resp.booking; resolve(); },
          error: reject
        });
      });

      this.files = [];
      this.refreshPreviews();

      await this.showToast('Check-out guardado y reserva finalizada');
      this.router.navigate([this.RUTA_LISTADO], { queryParams: { refresh: '1' }, replaceUrl: true });
    } catch (e) {
      await this.showToast('No se pudo finalizar la reserva', 'danger');
    } finally {
      this.loading.finalizar = false;
      this.cdr.markForCheck();
    }
  }

  continuar(): void {
    this.router.navigate([this.RUTA_LISTADO]);
  }

  /** ====== Cámara (Capacitor) ====== */
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
    const file = new File([blob], `checkout_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
    const nuevos = [...this.files, file].slice(0, this.MAX_FILES);
    const processed: File[] = [];
    for (const f of nuevos) processed.push(await this.compressImageSafe(f));
    this.files = processed;
    this.refreshPreviews();
    this.cdr.markForCheck();
  }

  /** ====== Utilidades de compresión ====== */
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
