import { Component, ViewChildren, QueryList, ViewChild } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { GeneralService } from './services/general.service';
import { ContactosService } from './services/contactos.service';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { NgZone } from '@angular/core';
import { SeoService } from './services/seo.service';
import { filter, map, mergeMap } from 'rxjs/operators';
import {
  IonRouterOutlet,
  Platform,
  ToastController,
  ModalController,
  ActionSheetController,
  AlertController,
  MenuController,
} from '@ionic/angular';
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

  @ViewChild(IonRouterOutlet, { static: true }) routerOutlet!: IonRouterOutlet; // <— un solo outlet

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
  get mostrarTabs(): boolean {
    const rutasSinTabs = ['/update-car/', '/new-car', '/usados', '/nuevos', '/seminuevos', '/m-nuevos'];
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
  async initializeApp() {
    await this.platform.ready();
    if (this.platform.is('android')) {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: '#D62828' });
      await StatusBar.setStyle({ style: Style.Dark });
    }

    if (this.platform.is('ios')) {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Dark });
    }
  }
  private registerHardwareBack() {
    this.platform.backButton.subscribeWithPriority(9999, async () => {
      const topModal = await this.modalCtrl.getTop();
      if (topModal) { await topModal.dismiss(); return; }

      const topAction = await this.actionSheetCtrl.getTop();
      if (topAction) { await topAction.dismiss(); return; }

      const topAlert = await this.alertCtrl.getTop();
      if (topAlert) { await topAlert.dismiss(); return; }

      const menuOpen = await this.menuCtrl.isOpen();
      if (menuOpen) { await this.menuCtrl.close(); return; }

      if (this.routerOutlet && this.routerOutlet.canGoBack()) {
        await this.routerOutlet.pop();
        return;
      }
      const current = this.router.url.split('?')[0];
      if (this.ROOT_PATHS.includes(current)) {
        await this.handleExitGesture();
        return;
      }
      window.history.length > 1 ? history.back() : this.router.navigateByUrl('/home', { replaceUrl: true });
    });
  }
  private async handleExitGesture() {
    if (!this.platform.is('android')) return;

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