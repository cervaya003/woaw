import { Component, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { PopoverController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AlertController } from '@ionic/angular';
import { Router, NavigationEnd } from '@angular/router';
import { AfterViewInit, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PopUpComponent } from '../../components/modal/pop-up/pop-up.component';
import { ActivatedRoute } from '@angular/router';
import { CarsService } from '../../services/cars.service';
import { GeneralService } from '../../services/general.service';
import { HistorealSearchComponent } from '../../components/historeal-search/historeal-search.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  textoCompleto: string = 'Compra y acelera';
  textoAnimado: string = '';
  textoIndex = 0;
  totalTextos = 2;
  esDispositivoMovil: boolean = false;
  correoHref: string = '';
  @ViewChild('carrusel', { static: false }) carrusel!: ElementRef;
  @ViewChild('videoElement', { static: false })
  videoElementRef!: ElementRef<HTMLVideoElement>;
  currentIndex = 0;
  avisoAceptado = false;
  terminosAceptados = false;
  public isLoggedIn: boolean = false;
  aceptaPoliticas: boolean = false;
  aplicandoTransicion = false;
  aplicandoTransicionCarrucelPrincipal = false;

  TiposVeiculo: string[] = [];

  // -----
  popoverRef: HTMLIonPopoverElement | null = null;
  terminoBusqueda: string = '';
  sugerencias: string[] = [];
  // -----

  overlayLoaded = false;

  imgenPrincipal: string = '';
  videoSrc: string = '';

  @ViewChild('videoEl', { static: false })
  private videoRef!: ElementRef<HTMLVideoElement>;

  constructor(
    private popoverCtrl: PopoverController,
    private alertCtrl: AlertController,
    private router: Router,
    private generalService: GeneralService,
    public carsService: CarsService
  ) { }

  async ngOnInit() {
    this.cargaimagen();
    this.cargavideo();

    // Refleja estado de login y verifica teléfono cuando haya sesión
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });

    this.escribirTexto();
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });
    setInterval(() => {
      this.textoIndex = (this.textoIndex + 1) % this.totalTextos;
    }, 10000);
    this.gatTiposVeiculos();
  }
  

  ngAfterViewInit(): void {
    this.generalService.aplicarAnimacionPorScroll(
      '.titulo-arrendamiento',
      '.banner-img img'
    );
  }
  // ----- -----
  escribirTexto() {
    let index = 0;
    const intervalo = setInterval(() => {
      this.textoAnimado += this.textoCompleto[index];
      index++;
      if (index === this.textoCompleto.length) {
        clearInterval(intervalo);
      }
    }, 150);
  }

  // # ----- ------
  gatTiposVeiculos() {
    this.carsService.gatTiposVeiculos().subscribe({
      next: (res: any) => {
        this.TiposVeiculo = res.slice(0, 9);
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('Error de Conexión', mensaje);
      },
    });
  }

  // ----- -----
  async abrirHistorial(ev: Event) {
    if (this.popoverRef) return;

    this.popoverRef = await this.popoverCtrl.create({
      component: HistorealSearchComponent,
      event: ev,
      translucent: true,
      showBackdrop: false,
      backdropDismiss: true,
      keyboardClose: false,
      cssClass: 'popover-historial',
    });

    await this.popoverRef.present();

    this.popoverRef.onDidDismiss().then(({ data }) => {
      if (data) {
        this.terminoBusqueda = data;
        this.irABusqueda(data);
      }
      this.popoverRef = null;
    });
  }

  onInputChange(ev: any) {
    const value = ev.detail.value;
    this.terminoBusqueda = value;
    if (this.popoverRef) {
      this.popoverRef.componentProps = {
        termino: value,
      };
    } else {
      this.abrirHistorial(ev);
    }
  }

  irABusqueda(sugerencia: string) {
    const termino = sugerencia.trim();
    if (!termino) return;
    this.terminoBusqueda = termino;
    this.guardarStorage(termino);
    this.generalService.setTerminoBusqueda('search');
    if (this.popoverRef) {
      this.popoverRef.dismiss();
      this.popoverRef = null;
    }
    this.router.navigate(['/search/vehiculos', termino]);
  }

  buscarPorTipo(tipo: string) {
    const termino = tipo.trim();
    if (!termino) return;
    this.generalService.setTerminoBusqueda('tipoVehiculo');
    this.router.navigate(['/search/vehiculos', termino]);
  }

  guardarStorage(termino: string) {
    const guardado = localStorage.getItem('historialBusqueda');
    let historial: string[] = guardado ? JSON.parse(guardado) : [];
    historial = historial.filter(
      (item) => item.toLowerCase() !== termino.toLowerCase()
    );
    historial.unshift(termino);
    historial = historial.slice(0, 10);
    localStorage.setItem('historialBusqueda', JSON.stringify(historial));
  } 
  async cargaimagen() {
    this.imgenPrincipal = '/assets/home/angel.webp';
    this.generalService.addPreload(this.imgenPrincipal, 'image');
    this.overlayLoaded = false;
    try {
      await Promise.all([
        this.generalService.preloadHero(this.imgenPrincipal, 4500),
      ]);
    } finally {
      this.overlayLoaded = true;
    }
  }
  async cargavideo() {
    this.videoSrc = 'assets/home/vp1.mp4';
    this.generalService.addPreload(this.videoSrc, 'video');
    try {
      await this.generalService.preloadVideo(this.videoSrc, 7000);
    } finally {
      this.forzarMuteAutoplay();
    }
  }
  private forzarMuteAutoplay(): void {
    const video = this.videoRef?.nativeElement;
    if (!video) return;
    video.muted = true;
    video.autoplay = true;
    video.play().catch(() => {
      console.warn('Autoplay bloqueado por el navegador');
    });
  }
  toggleMute(video: HTMLVideoElement) {
    video.muted = !video.muted;
  }
}

/**
 *
    this.router.navigate(['/search/vehiculos', termino], {
      queryParams: { origen: 'search' },
    });
 */
