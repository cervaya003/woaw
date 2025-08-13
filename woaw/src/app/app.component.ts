import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';
import { GeneralService } from './services/general.service';
import { ContactosService } from './services/contactos.service';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { NgZone } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { SeoService } from './services/seo.service';
import { filter, map, mergeMap } from 'rxjs/operators';
// Importamos la modal de perfil
import { PerfilComponent } from '../app/components/modal/perfil/perfil.component';
import { ModalController } from '@ionic/angular';

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

  constructor(
    private platform: Platform,
    private generalService: GeneralService,
    private contactosService: ContactosService,
    private router: Router,
    private seoService: SeoService,
    private activatedRoute: ActivatedRoute,
    private zone: NgZone,
    private modalCtrl: ModalController,
    private menuCtrl: MenuController,
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
  }
  get mostrarTabs(): boolean {
    const rutasSinTabs = ['/update-car/', '/new-car'];
    return (
      this.esDispositivoMovil &&
      !rutasSinTabs.some((r) => this.currentUrl.startsWith(r))
    );
  }
  get mostrarBtnAll(): boolean {
    const rutasSinTabs = ['/update-car/', '/arrendamiento','/lote-edit/'];
    const rutaActual = this.router.url;
    return !rutasSinTabs.some(ruta => rutaActual.startsWith(ruta));
  }
  async initializeApp() {
    await this.platform.ready();
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light });
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
      console.error('❌ Redirección fallida:', err);
    }
  }
  cerrarMenu() {
    this.menuCtrl.close('menuLateral');
  }
  async logout() {
    // console.log(nuevaImagen);
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
    // Mostrar spinner
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
}
/**
 *
import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { StatusBar, Style } from '@capacitor/status-bar';
import { GeneralService } from './services/general.service';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  esDispositivoMovil: boolean = false;

  constructor(
    private platform: Platform,
    private generalService: GeneralService,
    private router: Router,
    private location: Location
  ) {
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });

    // Restaurar última ruta si recargó en "/"
    this.platform.ready().then(() => {
      const rutaGuardada = localStorage.getItem('ultimaRuta');
      if (window.location.pathname === '/' && rutaGuardada && rutaGuardada !== '/') {
        this.router.navigateByUrl(rutaGuardada);
      }
    });

    // Cada vez que navega, guardar y ocultar la ruta
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Guardar la ruta real
        localStorage.setItem('ultimaRuta', event.urlAfterRedirects);
        // Limpiar la URL visual
        this.location.replaceState('/');
      });

    this.initializeApp();
  }

  async initializeApp() {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light });
  }
}

 */
