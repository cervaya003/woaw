import { Component, ViewChildren, QueryList } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { GeneralService } from './services/general.service';
import { ContactosService } from './services/contactos.service';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { NgZone } from '@angular/core';
import { SeoService } from './services/seo.service';
import { filter, map, mergeMap } from 'rxjs/operators';
// Importamos la modal de perfil
import { PerfilComponent } from '../app/components/modal/perfil/perfil.component';
import {
  IonRouterOutlet,
  Platform,
  ToastController,
  ModalController,
  ActionSheetController,
  AlertController,
  MenuController,
} from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';


declare let gtag: Function;

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  currentUrl: string = '';
  esDispositivoMovil: boolean = false;
  public isLoggedIn: boolean = false;
  public MyRole: string | null = null;

  @ViewChildren(IonRouterOutlet) routerOutlets!: QueryList<IonRouterOutlet>;
  private lastBackTime = 0;
  private readonly ROOT_PATHS = ['/', '/home', '/inicio', '/autenticacion-user'];

  constructor(
    private platform: Platform,
    private generalService: GeneralService,
    private contactosService: ContactosService,
    private router: Router,
    private toastCtrl: ToastController,
    private seoService: SeoService,
    private activatedRoute: ActivatedRoute,
    private zone: NgZone,
    private modalCtrl: ModalController,
    private menuCtrl: MenuController,

    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController,
  ) {
    this.initializeApp();
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        gtag('config', 'G-9FQLZKFT9Q', {
          page_path: event.urlAfterRedirects,
        });
      }
    });
    this.router.events.subscribe(() => {
      this.currentUrl = this.router.url;
    });
    this.setDynamicTitle();

    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    this.generalService.tipoRol$.subscribe((rol) => {
      this.MyRole = rol;
    });

    // ----- ------ 

    this.platform.ready().then(() => this.registerHardwareBack());

  }
  async initializeApp() {
    await this.platform.ready();

    if (this.platform.is('android')) {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: '#D62828' }); // rojo
      await StatusBar.setStyle({ style: Style.Dark });          // iconos clarosƒ
    }
  }
  get mostrarTabs(): boolean {
    const rutasSinTabs = ['/update-car/', '/new-car'];
    return (
      this.esDispositivoMovil &&
      !rutasSinTabs.some((r) => this.currentUrl.startsWith(r))
    );
  }
  get mostrarBtnAll(): boolean {
    const rutasSinTabs = ['/update-car/', '/arrendamiento', '/lote-edit/'];
    const rutaActual = this.router.url;
    return !rutasSinTabs.some(ruta => rutaActual.startsWith(ruta));
  }
  setDynamicTitle() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => {
          let route = this.activatedRoute.firstChild;
          while (route?.firstChild) route = route.firstChild;
          return route;
        }),
        filter((route) => !!route),
        mergeMap((route) => route!.data)
      )
      .subscribe((data) => {
        if (data['title']) this.seoService.updateTitle(data['title']);
      });
  }
  RedesSociales(tipo: string) {
    this.contactosService.RedesSociales(tipo);
  }
  async redirecion(url: string) {
    try {
      await this.menuCtrl.close('menuLateral');
      await new Promise((resolve) => setTimeout(resolve, 200));
      this.zone.run(() => this.router.navigateByUrl('/' + url));
    } catch (err) {
      console.error('Redirección fallida:', err);
    }
  }
  cerrarMenu() {
    this.menuCtrl.close('menuLateral');
  }
  async logout() {
    this.generalService.confirmarAccion(
      '¿Deseas salir?',
      '¿Estás seguro de que deseas salir de la aplicación?',
      async () => {
        await this.generalService.loading('Saliendo...');
        this.generalService.eliminarToken();
        this.cerrarMenu();
        setTimeout(() => {
          this.router.navigate(['/home']);
          this.generalService.alert(
            '¡Saliste de tu sesión!',
            '¡Hasta pronto!',
            'info'
          );
        }, 1500);
      }
    );
  }
  async abrirModalPerfil() {
    await this.generalService.loading('Cargando...');
    this.cerrarMenu();
    setTimeout(async () => {
      // Ocultar spinner
      await this.generalService.loadingDismiss();
      const modal = await this.modalCtrl.create({
        component: PerfilComponent,
        breakpoints: [0, 0.5, 1],
        cssClass: 'modal-perfil',
        initialBreakpoint: 1,
        handle: true,
        showBackdrop: true,
      });
      await modal.present();
    }, 500);
  }


  private registerHardwareBack() {
    App.addListener('backButton', async () => {
      const topModal = await this.modalCtrl.getTop();
      if (topModal) { await topModal.dismiss(); return; }

      const topAction = await this.actionSheetCtrl.getTop();
      if (topAction) { await topAction.dismiss(); return; }

      const topAlert = await this.alertCtrl.getTop();
      if (topAlert) { await topAlert.dismiss(); return; }

      const menuOpen = await this.menuCtrl.isOpen();
      if (menuOpen) { await this.menuCtrl.close(); return; }

      for (const outlet of this.routerOutlets.toArray()) {
        if (outlet && outlet.canGoBack()) {
          outlet.pop();
          return;
        }
      }

      const current = this.router.url.split('?')[0];
      if (this.ROOT_PATHS.includes(current)) {
        await this.handleExitGesture();
        return;
      }

      this.router.navigateByUrl('/home', { replaceUrl: true });
    });
  }

  private async handleExitGesture() {
    if (!this.platform.is('android')) {
      return;
    }

    const now = Date.now();
    if (now - this.lastBackTime < 1500) {
      App.exitApp();
      return;
    }

    this.lastBackTime = now;
    const toast = await this.toastCtrl.create({
      message: 'Presiona atrás de nuevo para salir',
      duration: 1200,
      position: 'bottom',
    });
    await toast.present();
  }

}