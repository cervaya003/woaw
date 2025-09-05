import { Component, OnInit } from '@angular/core';
import { GeneralService } from '../../services/general.service';
import { RegistroService } from '../../services/registro.service';
import { ModalController } from '@ionic/angular';
import { PoliticasComponent } from '../../components/modal/politicas/politicas.component';
import { AvisoPrivasidadComponent } from '../../components/modal/aviso-privasidad/aviso-privasidad.component';
import { ActivatedRoute } from '@angular/router';
import { MenuController } from '@ionic/angular';
@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  standalone: false,
})
export class InicioPage implements OnInit {

  esDispositivoMovil: boolean = false;
  showSplash: boolean = true;
  splash: boolean = false;
  MostrarLogin: boolean = true;
  MostrarRegistro: boolean = false;
  MostrarRecuperacion: boolean = false;

  contenidos = [
    {
      imagen: '/assets/icon/logo4.png',
      titulo: 'Bienvenido a',
      texto: 'Compra o vende tu auto fácil, rápido y seguro.',
      color: 'blanco',
    },
    {
      imagen: null,
      titulo: 'Publica sin costo',
      texto: 'Sube tu auto en minutos y llega a miles de compradores.',
      color: 'rojo',
    },
    {
      imagen: null,
      titulo: 'Encuentra arrendamiento',
      texto:
        'Accede a opciones flexibles de renta de vehículos para cada necesidad.',
      color: 'rojo',
    },
    {
      imagen: null,
      titulo: 'Compra y vende motos',
      texto:
        'Publica tu moto o encuentra la ideal para ti. Rápido y sin complicaciones.',
      color: 'rojo',
    },
    {
      imagen: null,
      titulo: 'Camiones para cada ruta',
      texto:
        'Compra y vende camiones fácilmente, sin intermediarios ni comisiones.',
      color: 'rojo',
    },
  ];

  indexContenido = 0;
  mostrarContenido = this.contenidos[0]; animarImagen = false;
  animarTexto = false;
  imgenPrincipal: string = '';
  videoSrc: string = '';
  videoSrc2: string = '';

  constructor(
    private generalService: GeneralService,
    private modalCtrl: ModalController,
    private activatedRoute: ActivatedRoute,
    private registroService: RegistroService,
    private menuCtrl: MenuController,
  ) { }

  async ngOnInit() {
    this.cargaimagen();
    this.cargavideo();
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });
    this.mostrarAnimaciones();
  }
  ionViewWillEnter() {
    this.cargaimagen();
    this.cargavideo();
  }
  mostrarAnimaciones() {
    this.animarImagen = false;
    this.animarTexto = false;
    setTimeout(() => {
      this.animarImagen = true;
    }, 50);
    setTimeout(() => {
      this.animarTexto = true;
    }, 500);
  }
  async abrirModalTerminos() {
    const modal = await this.modalCtrl.create({
      component: PoliticasComponent,
      componentProps: {
        onAceptar: () => {
          console.log('Aceptado');
        },
        onCancelar: () => {
          console.log('Cancelado');
        },
      },
      backdropDismiss: true,
      showBackdrop: true,
      ...(!this.esDispositivoMovil && {
        cssClass: 'modal-consentimiento',
      }),
      ...(this.esDispositivoMovil && {
        breakpoints: [0, 0.7, 1],
        initialBreakpoint: 1,
        handle: true,
      }),
    });

    await modal.present();
  }
  RegistroLogin() {
    this.MostrarLogin = !this.MostrarLogin;
    this.MostrarRecuperacion = false;
  }
  cambioEstatus(dato: string) {
    switch (dato) {
      case 'registro':
        this.MostrarLogin = false;
        this.MostrarRegistro = true;
        this.MostrarRecuperacion = false;
        break;
      case 'login':
        this.MostrarLogin = true;
        this.MostrarRegistro = false;
        this.MostrarRecuperacion = false;
        break;
      case 'reset':
        this.MostrarLogin = false;
        this.MostrarRegistro = false;
        this.MostrarRecuperacion = true;
        break;
      default:
        break;
    }
  }
  recupercion() {
    this.MostrarRecuperacion = !this.MostrarRecuperacion;
  }
  // ## ------ POLITICAS Y AVISO DE PRIVACIDAD ------ ##
  async mostrarTerminos() {
    const modal = await this.modalCtrl.create({
      component: PoliticasComponent,
      componentProps: {
        onAceptar: () => this.setAceptado('terminos', true),
        onCancelar: () => this.setAceptado('terminos', false),
      },
      backdropDismiss: true,
      showBackdrop: true,
      ...(!this.esDispositivoMovil && {
        cssClass: 'modal-consentimiento',
      }),
      ...(this.esDispositivoMovil && {
        breakpoints: [0, 0.7, 1],
        initialBreakpoint: 1,
        handle: true,
      }),
    });
    await modal.present();
  }
  async mostrarAviso() {
    const modal = await this.modalCtrl.create({
      component: AvisoPrivasidadComponent,
      componentProps: {
        onAceptar: () => this.setAceptado('aviso', true),
        onCancelar: () => this.setAceptado('aviso', false),
      },
      backdropDismiss: true,
      showBackdrop: true,
      ...(!this.esDispositivoMovil && {
        cssClass: 'modal-consentimiento',
      }),
      ...(this.esDispositivoMovil && {
        breakpoints: [0, 0.7, 1],
        initialBreakpoint: 1,
        handle: true,
      }),
    });
    await modal.present();
  }
  setAceptado(tipo: 'aviso' | 'terminos', valor: boolean) {
    if (valor === true) {
      localStorage.setItem(tipo, 'true');
    } else {
      localStorage.setItem(tipo, 'false');
      const titulos: Record<typeof tipo, string> = {
        aviso: 'Aviso de Privacidad',
        terminos: 'Términos y Condiciones',
      };

      const mensajes: Record<typeof tipo, string> = {
        aviso:
          'Por tu seguridad y protección de datos, es necesario aceptar el Aviso de Privacidad.',
        terminos:
          'Debes aceptar los Términos y Condiciones para usar este servicio de forma segura y responsable.',
      };

      this.generalService.alert(titulos[tipo], mensajes[tipo], 'info');

      localStorage.removeItem(tipo);
    }
  }
  mostrarSplash() {
    if (this.esDispositivoMovil == true) {
      this.mostrarContenido = this.contenidos[0];
      this.splash = true;
      setInterval(() => {
        this.splash = false;
      }, 3500);
    } else {
      setInterval(() => {
        this.indexContenido = (this.indexContenido + 1) % this.contenidos.length;
        this.mostrarContenido = this.contenidos[this.indexContenido];
        this.mostrarAnimaciones();
      }, 10000);
    }
  }
  async cargaimagen() {
    this.imgenPrincipal = 'assets/autos/arre5.png';
    this.generalService.addPreload(this.imgenPrincipal, 'image');
    try {
      await Promise.all([
        this.generalService.preloadHero(this.imgenPrincipal, 4500),
      ]);
    } finally {
    }
  }

  async cargavideo() {
    this.videoSrc = 'assets/img/vc1.mp4';
    this.videoSrc2 = 'assets/img/vc3.mp4';
    this.generalService.addPreload(this.videoSrc, 'video');
    this.generalService.addPreload(this.videoSrc2, 'video');
    try {
      this.mostrarSplash();
      await this.generalService.preloadVideo(this.videoSrc, 7000);
      await this.generalService.preloadVideo(this.videoSrc2, 7000);
    } finally {
    }
  }

}



/* 
 async ngOnInit() {
    console.log('Se ejecuta solo una vez al crear el componente');
  }

  ionViewWillEnter() {
    console.log('Se ejecuta cada vez que entro a la página (antes de mostrarla)');
  }

  ionViewDidEnter() {
    console.log('Se ejecuta cada vez que entro a la página (ya visible)');
  }

  ionViewWillLeave() {
    console.log('Se ejecuta antes de salir de la página');
  }

  ionViewDidLeave() {
    console.log('Se ejecuta después de salir de la página');
  }
*/