import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RegistroService } from '../../services/registro.service';
import { GeneralService } from '../../services/general.service';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { CarsService } from '../../services/cars.service';
import { MenuController } from '@ionic/angular';
import { PopoverController } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { AlertController } from '@ionic/angular';

import { ModalController } from '@ionic/angular';
import { PoliticasComponent } from '../../components/modal/politicas/politicas.component';
import { AvisoPrivasidadComponent } from '../../components/modal/aviso-privasidad/aviso-privasidad.component';
import { PopUpComponent } from '../../components/modal/pop-up/pop-up.component';
import { ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class FooterComponent implements OnInit {
  blog: any[] = [];
  mostrarMapa: boolean = false;
  mostrarVerMas: boolean = false;
  public aceptoPopup: boolean = false;
  public YaseptePopup: boolean = false;
  public esDispositivoMovil: boolean = false;
  public dispositivo: string = '';

  constructor(
    private menu: MenuController,
    private generalService: GeneralService,
    private popoverCtrl: PopoverController,
    private fb: FormBuilder,
    private alertCtrl: AlertController,
    private router: Router,
    private modalCtrl: ModalController,
    private activatedRoute: ActivatedRoute,
    private carsService: CarsService
  ) {}

  async ngOnInit() {
    // localStorage.removeItem('popUp');
    localStorage.setItem('popUp', 'true');
    const popUpAceptado = localStorage.getItem('popUp') === 'true';
    if (popUpAceptado) {
      this.YaseptePopup = true;
    }

    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
      this.dispositivo = tipo;
    });

    await this.getBlog();

    const url = window.location.pathname;
    this.mostrarMapa = url.includes('/home');
  }

  async getBlog() {
    this.carsService.getBlog().subscribe({
      next: (res: any) => {
        this.generalService.loadingDismiss();
        this.blog = res;
        this.mostrarVerMas = res.length > 3;
      },
      error: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  async mostrarTerminos() {
    let modal;
    if (this.dispositivo === 'telefono') {
      modal = await this.modalCtrl.create({
        component: PoliticasComponent,
        componentProps: {
          onAceptar: () => this.setAceptado('terminos', true),
          onCancelar: () => this.setAceptado('terminos', false),
        },
        breakpoints: [0, 0.7, 1],
        cssClass: 'modal-perfil',
        initialBreakpoint: 0.7,
        handle: true,
        backdropDismiss: true,
        showBackdrop: true,
      });
    } else {
      modal = await this.modalCtrl.create({
        component: PoliticasComponent,
        componentProps: {
          onAceptar: () => this.setAceptado('terminos', true),
          onCancelar: () => this.setAceptado('terminos', false),
        },
        backdropDismiss: true,
        showBackdrop: true,
        cssClass: 'modal-consentimiento',
      });
    }
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

  async mostrarAviso() {
    let modal;
    if (this.dispositivo === 'telefono') {
      modal = await this.modalCtrl.create({
        component: AvisoPrivasidadComponent,
        componentProps: {
          onAceptar: () => this.setAceptado('aviso', true),
          onCancelar: () => this.setAceptado('aviso', false),
        },
        breakpoints: [0, 0.7, 1],
        cssClass: 'modal-perfil',
        initialBreakpoint: 0.7,
        handle: true,
        backdropDismiss: true,
        showBackdrop: true,
      });
    } else {
      modal = await this.modalCtrl.create({
        component: AvisoPrivasidadComponent,
        componentProps: {
          onAceptar: () => this.setAceptado('aviso', true),
          onCancelar: () => this.setAceptado('aviso', false),
        },
        backdropDismiss: true,
        showBackdrop: true,
        cssClass: 'modal-consentimiento',
      });
    }
    await modal.present();
  }

  handleContactoClick(event: Event) {
    event.preventDefault();
    const popUpAceptado = localStorage.getItem('popUp') === 'true';
    console.log(popUpAceptado);

    if (popUpAceptado) {
      window.open('mailto:contacto@goautos.mx', '_blank');
    } else {
      this.mostrarPopUp('email');
    }
  }

  async mostrarPopUp(accion: string) {
    // localStorage.removeItem('popUp');
    const popUp = localStorage.getItem('popUp') === 'true';
    if (popUp) {
      if (accion === 'telefono') {
        window.open('tel:+524425516440');
      } else if (accion === 'email') {
        window.open('mailto:contacto@goautos.mx', '_blank');
      }
      this.generalService.alert(
        'PopUp Aceptado',
        '¡Gracias por aceptar el PopUp! Ahora puedes continuar con tu registro.',
        'success'
      );
      return;
    }

    let modal;
    if (this.dispositivo === 'telefono') {
      modal = await this.modalCtrl.create({
        component: PopUpComponent,
        breakpoints: [0, 0.7, 1],
        cssClass: 'modal-perfil',
        initialBreakpoint: 0.7,
        handle: true,
        backdropDismiss: false,
        showBackdrop: true,
      });
    } else {
      modal = await this.modalCtrl.create({
        component: PopUpComponent,
        backdropDismiss: false,
        showBackdrop: true,
        cssClass: 'modal-consentimiento',
      });
    }

    await modal.present();

    const { data } = await modal.onDidDismiss();
    this.popUpAceptado(data, accion);
  }

  handleTelefonoClick(event: Event) {
    event.preventDefault();
    const popUpAceptado = localStorage.getItem('popUp') === 'true';

    if (popUpAceptado) {
      window.open('tel:+524425516440');
    } else {
      this.mostrarPopUp('telefono');
    }
  }

  async popUpAceptado(valor: boolean, accion: string) {
    if (valor) {
      localStorage.setItem('popUp', 'true');
      if (accion === 'telefono') {
        window.open('tel:+524425516440');
      } else if (accion === 'email') {
        window.open('mailto:contacto@goautos.mx', '_blank');
      }
      this.generalService.alert(
        'PopUp Aceptado',
        '¡Gracias por aceptar el PopUp! Ahora puedes continuar con tu registro.',
        'success'
      );
    } else {
      console.error('El usuario no aceptó el PopUp');
    }
  }

  redirecion(url: string) {
    this.router.navigate([url]);
  }

  onCambioConsentimiento(event: any) {
    const marcado = event.detail.checked;
    if (marcado) {
      this.aceptoPopup = true;
    } else {
      this.aceptoPopup = false;
    }
  }

  aceptarConsentimiento() {
    if (this.aceptoPopup) {
      localStorage.setItem('popUp', 'true');
      this.YaseptePopup = true;
    } else {
      this.generalService.alert(
        'Consentimiento requerido',
        'Debes aceptar el aviso de privacidad para continuar.',
        'warning'
      );
    }
  }
}
