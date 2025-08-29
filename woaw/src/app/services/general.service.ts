import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Platform } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { AlertController } from '@ionic/angular';
import { LoadingController } from '@ionic/angular';
import { ToastController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { PopoverController } from '@ionic/angular';
import { AlertComponent } from '../components/alert/alert.component';
import { Router } from '@angular/router';

import { fromEvent, merge, Subscription } from 'rxjs';
import { map, startWith, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { NgZone } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GeneralService {
  private popoverActivo?: HTMLIonPopoverElement;
  private preloadCache = new Map<string, Promise<void>>();
  public esMovil = new BehaviorSubject<boolean>(false);

  // Comportamiento reactivo del tipo de dispositivo
  private readonly BP_PHONE = 768;
  private readonly BP_TABLET = 1024;
  private resizeSub?: Subscription;
  private dispositivoSubject = new BehaviorSubject<
    'telefono' | 'tablet' | 'computadora'
  >('computadora');
  public dispositivo$ = this.dispositivoSubject.asObservable();

  private tokenSubject = new BehaviorSubject<boolean>(this.hasToken());
  public tokenExistente$ = this.tokenSubject.asObservable();

  private valorGlobalSubject = new BehaviorSubject<number>(8);
  public valorGlobal$ = this.valorGlobalSubject.asObservable();

  // ---- Estado reactivo para el rol del usuario ----
  private rolSubject = new BehaviorSubject<string | null>(this.obtenerRol());
  public tipoRol$ = this.rolSubject.asObservable();

  // ----- Search busacdor tipo -----
  private terminoBusquedaSource = new BehaviorSubject<string | null>(
    localStorage.getItem('terminoBusqueda') || null
  );
  terminoBusqueda$ = this.terminoBusquedaSource.asObservable();

  // Evitar dobles navegaciones a autenticación
  private redirigiendoTelefono = false;

  constructor(
    private platform: Platform,
    private http: HttpClient,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private popoverCtrl: PopoverController,
    private router: Router,
    private ngZone: NgZone,
  ) {
    this.detectarDispositivo();
    this.detectarDispositivoSinze();

    this.resizeSub = fromEvent(window, 'resize')
      .pipe(debounceTime(150))
      .subscribe(() => this.detectarDispositivoSinze());
  }
  ngOnDestroy(): void {
    this.resizeSub?.unsubscribe();
  }
  // ==== Auth / User helpers ====

  // Obtiene el rol desde localStorage
  obtenerRol(): string | null {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        return parsed.rol || null;
      } catch (e) {
        console.error('Error al parsear el usuario del localStorage:', e);
      }
    }
    return null;
  }

  // Verifica si el token existe en localStorage
  tokenPresente(): boolean {
    const isAuthenticated = this.hasToken();
    this.tokenSubject.next(isAuthenticated);
    return isAuthenticated;
  }

  hasToken(): boolean {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) return false;

    try {
      const user = JSON.parse(userStr);
      const camposRequeridos = ['rol', 'nombre', 'email'];

      for (const campo of camposRequeridos) {
        if (!user[campo]) {
          this.presentToast(`Campo faltante en user: ${campo}`, 'danger');
          return false;
        }
      }

      return true;
    } catch (_error) {
      this.presentToast('Error en el guards', 'danger');
      return false;
    }
  }

  // Guarda token y actualiza el estado reactivo
  guardarCredenciales(token: string, user: any): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.tokenSubject.next(true);
    this.rolSubject.next(user?.rol || null);

    // ✅ Revisar teléfono inmediatamente (sin reload)
    const telefono = this.getTelefonoUsuario(user);
    const rutaActual = (this.router.url || '').split('?')[0] || '/inicio';

    if (!telefono) {
      const next = rutaActual || '/inicio';
      this.router.navigate(
        ['/autenticacion-user'],
        { queryParams: { next }, replaceUrl: true }
      );
    } else {
      // Si tiene teléfono, lo dejamos/mandamos a inicio
      if (rutaActual !== '/inicio') {
        this.router.navigate(['/inicio'], { replaceUrl: true });
      }
    }
  }

  // === Helper robusto para extraer/validar el teléfono del usuario ===
  private getTelefonoUsuario(rawUser: any): string {
    if (!rawUser) return '';

    const user = typeof rawUser === 'string' ? JSON.parse(rawUser) : rawUser;

    const posibles: any[] = [
      user?.numero,
      user?.telefono,
      user?.phone,
      user?.celular,
      user?.mobile,
      user?.tel,
      user?.contacto?.telefono,
      user?.contacto?.celular,
      user?.contact?.phone,
    ];

    const valorCrudo = posibles.find(v => v !== null && v !== undefined) ?? '';
    const str = String(valorCrudo).trim();

    // valida que tenga al menos 7 dígitos reales
    const soloDigitos = str.replace(/\D+/g, '');
    const esValido = soloDigitos.length >= 7;

    return esValido ? str : '';
  }

  // Redirige a /autenticacion-user si no hay número guardado (útil fuera del login)
  verificarTelefono(): void {
    const token = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');
    if (!token || !rawUser || this.redirigiendoTelefono) return;

    const rutaActual = (this.router.url || '').split('?')[0];
    if (rutaActual === '/autenticacion-user') return; // evita loop

    let telefono = '';
    try {
      telefono = this.getTelefonoUsuario(rawUser);
    } catch {
      telefono = '';
    }

    if (!telefono) {
      this.redirigiendoTelefono = true;
      const next = rutaActual || '/inicio';
      this.router.navigate(
        ['/autenticacion-user'],
        { queryParams: { next }, replaceUrl: true }
      ).finally(() => {
        setTimeout(() => (this.redirigiendoTelefono = false), 500);
      });
    }
  }

  // Elimina token y notifica cambio
  eliminarToken(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.tokenSubject.next(false);
    this.rolSubject.next(null);
    this.router.navigate(['/home']);
    location.reload();
  }

  // Obtener token si lo necesitas
  obtenerToken(): string | null {
    return localStorage.getItem('token');
  }

  // ----------------- DISPOSITIVO -----------------
  private detectarDispositivoSinze() {
    const width = window.innerWidth;
    if (width <= 768) {
      this.dispositivoSubject.next('telefono');
    } else if (width > 768 && width <= 1124) {
      this.dispositivoSubject.next('tablet');
    } else {
      this.dispositivoSubject.next('computadora');
    }
  }

  detectarDispositivo() {
    const isMobile = this.platform.is('ios') || this.platform.is('android');
    this.esMovil.next(isMobile);
  }

  // ----------------- Utilidades varias -----------------
  setTerminoBusqueda(termino: string) {
    this.terminoBusquedaSource.next(termino);
    localStorage.setItem('terminoBusqueda', termino);
  }

  enviarCorreoContacto(nombre: string, correo: string) {
    return this.http.post(`${environment.api_key}/contacto`, {
      nombre,
      correo,
    });
  }

  async alert(
    header: string,
    message: string,
    type: 'success' | 'danger' | 'warning' | 'info' = 'danger',
    status: boolean = true
  ) {
    await this.dismissAlert();

    this.popoverActivo = await this.popoverCtrl.create({
      component: AlertComponent,
      componentProps: { header, message, type },
      cssClass: 'no-scroll-popover',
      backdropDismiss: false,
      showBackdrop: true,
      translucent: true,
    });

    await this.popoverActivo.present();
    if (status) {
      await this.loadingDismiss();
    }
  }

  async dismissAlert() {
    if (this.popoverActivo) {
      await this.popoverActivo.dismiss();
      this.popoverActivo = undefined;
    }
  }

  async confirmarAccion(
    mensaje: string,
    titulo: string,
    onAceptar: () => void,
    submensaje?: string
  ) {
    const mensajeFinal = submensaje ? `${mensaje}\n\n\n${submensaje}` : mensaje;

    const alert = await this.alertController.create({
      header: titulo,
      message: mensajeFinal,
      cssClass: 'custom-alert danger alert-force-md',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Aceptar', handler: () => onAceptar() },
      ],
    });

    await alert.present();
  }

  async loading(message: string) {
    const loading = await this.loadingController.create({
      message,
      spinner: 'crescent',
      cssClass: 'spinner-rojo',
      backdropDismiss: false,
    });
    await loading.present();
  }

  async loadingDismiss() {
    return await this.loadingController.dismiss();
  }

  obtenerDireccionDesdeCoordenadas(lat: number, lng: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder();
      const latlng = { lat, lng };

      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const direccion = results[0].formatted_address;
          resolve(direccion);
        } else {
          reject(`Error al obtener la dirección: ${status}`);
        }
      });
    });
  }

  async presentToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'info' = 'danger'
  ) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
    });
    toast.present();
  }

  getClaseTipo(tipoVenta: string): string {
    const tipo = tipoVenta?.toLowerCase() || 'usado';
    return `tipo-${tipo}`;
  }

  getClaseTipoBarra(tipoVenta: string): string {
    const tipo = tipoVenta?.toLowerCase() || 'usado';
    return `tipo-barra-${tipo}`;
  }

  aplicarAnimacionPorScroll(...clases: string[]) {
    const selector = clases.join(', ');
    const elementos = document.querySelectorAll(selector);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            target.classList.add('animar');
          } else {
            target.classList.remove('animar');
          }
        });
      },
      { threshold: 0.4 }
    );

    elementos.forEach((el) => observer.observe(el));
  }
  actualizarTelefono(lada: string, telefono: string): Observable<any> {
    const token = localStorage.getItem('token') || '';
    const url = `${environment.api_key}/users/phone`;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const body = { lada, telefono };

    return this.http.put(url, body, { headers });
  }
  actualizarUserLocal(patch: Partial<any>) {
    const raw = localStorage.getItem('user');
    if (!raw) return;
    try {
      const prev = JSON.parse(raw);
      const next = { ...prev, ...patch };
      localStorage.setItem('user', JSON.stringify(next));
      this.rolSubject.next(next?.rol || null);
    } catch {
    }
  }






  private withTimeout<T>(p: Promise<T>, ms: number, key?: string): Promise<T> {
    let t: any;
    const killer = new Promise<never>((_, rej) =>
      t = setTimeout(() => {
        if (key) this.preloadCache.delete(key);
        rej(new Error('timeout'));
      }, ms)
    );
    return Promise.race([p, killer]).finally(() => clearTimeout(t));
  }

  preloadHero(url: string, timeoutMs = 5000): Promise<void> {
    if (this.preloadCache.has(url)) return this.preloadCache.get(url)!;

    const job = new Promise<void>((resolve, reject) => {
      const img = new Image();
      (img as any).fetchPriority = 'high';
      (img as any).decoding = 'async';
      img.src = url;

      img.onload = async () => {
        try {
          if (typeof (img as any).decode === 'function') {
            await (img as any).decode();
          }
          resolve();
        } catch { resolve(); }
      };
      img.onerror = () => reject(new Error('img error'));
    });

    const guarded = this.withTimeout(job, timeoutMs, url)
      .catch((e) => { this.preloadCache.delete(url); throw e; });

    this.preloadCache.set(url, guarded);
    return guarded;
  }

  preloadVideo(src: string, timeoutMs = 8000): Promise<void> {
    if (this.preloadCache.has(src)) return this.preloadCache.get(src)!;

    const job = new Promise<void>((resolve, reject) => {
      const v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      (v as any).playsInline = true;
      v.src = src;
      v.oncanplaythrough = () => resolve();
      v.onerror = () => reject(new Error('video error'));
    });

    const guarded = this.withTimeout(job, timeoutMs, src)
      .catch((e) => { this.preloadCache.delete(src); throw e; });

    this.preloadCache.set(src, guarded);
    return guarded;
  }
  addPreload(url: string, as: 'image' | 'video') {
    const link = document.createElement('link');
    link.rel = 'preload';
    (link as any).as = as;
    link.href = url;
    document.head.appendChild(link);
  }
  addPreconnect(origin: string) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
}
