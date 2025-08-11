import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Platform } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { AlertController } from '@ionic/angular';
import { LoadingController } from '@ionic/angular';
import { IonicModule, ToastController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ModalController } from '@ionic/angular';
import { CustomAlertComponent } from '../components/custom-alert/custom-alert.component';
import { PopoverController } from '@ionic/angular';
import { AlertComponent } from '../components/alert/alert.component';
import { Router, NavigationStart } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class GeneralService {
  private popoverActivo?: HTMLIonPopoverElement;

  public esMovil = new BehaviorSubject<boolean>(false);

  // Comportamiento reactivo del tipo de dispositivo
  private dispositivoSubject = new BehaviorSubject<
    'telefono' | 'tablet' | 'computadora'
  >('computadora');
  public dispositivo$ = this.dispositivoSubject.asObservable();

  private tokenSubject = new BehaviorSubject<boolean>(this.hasToken());
  public tokenExistente$ = this.tokenSubject.asObservable();

  private valorGlobalSubject = new BehaviorSubject<number>(8);
  public valorGlobal$ = this.valorGlobalSubject.asObservable();

  // ---- NUEVO: Estado reactivo para el rol del usuario ----
  private rolSubject = new BehaviorSubject<string | null>(this.obtenerRol());
  public tipoRol$ = this.rolSubject.asObservable();

  // ----- Search busacdor tipo -----
  private terminoBusquedaSource = new BehaviorSubject<string | null>(
    localStorage.getItem('terminoBusqueda') || null
  );
  terminoBusqueda$ = this.terminoBusquedaSource.asObservable();

  constructor(
    private platform: Platform,
    private http: HttpClient,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private popoverCtrl: PopoverController,
    private router: Router
  ) {
    this.detectarDispositivo();
    this.detectarDispositivoSinze();
  }

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
    } catch (error) {
      this.presentToast('Error en el guards', 'danger');
      return false;
    }
  }
  // Guarda token y actualiza el estado reactivo
  guardarCredenciales(token: string, user: any): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.tokenSubject.next(true);
    this.rolSubject.next(user.rol || null);
    location.reload();
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
    } else if (width > 768 && width <= 1024) {
      this.dispositivoSubject.next('tablet');
    } else {
      this.dispositivoSubject.next('computadora');
    }
  }
  detectarDispositivo() {
    const isMobile = this.platform.is('ios') || this.platform.is('android');
    this.esMovil.next(isMobile);
  }
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
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Aceptar',
          handler: () => {
            onAceptar();
          },
        },
      ],
    });

    await alert.present();
  }
  async loading(message: string) {
    const loading = await this.loadingController.create({
      message: message,
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
          // Puedes elegir el formato que prefieras
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
      {
        threshold: 0.4,
      }
    );

    elementos.forEach((el) => observer.observe(el));
  }
  // ## ----- ----- -----
  // Esto nunca se hace ☢️☢️☢️
  // handleRefrescarAutos(ubicacion: string) {
  //   switch (ubicacion) {
  //     case 'nuevos':
  //       this.nuevosPage.getCarsNews();
  //       break;
  //     case 'seminuevos':
  //       this.seminuevosPage.getCarsSeminuevos();
  //       break;
  //     case 'usados':
  //       this.usadosPage.getCarsUsados();
  //       break;
  //     case 'favoritos':
  //       this.faviritosPage.getCarsFavoritos();
  //       break;
  //     default:
  //       console.warn('Ubicación no reconocida:', ubicacion);
  //   }
  // }
}
