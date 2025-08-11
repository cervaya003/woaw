import { CarsService } from './../../../services/cars.service';
import { Component, OnInit, Input } from '@angular/core';
import { IonSelect } from '@ionic/angular';
import { IonInput } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Router, NavigationStart } from '@angular/router';
import { GeneralService } from '../../../services/general.service';
import { AlertController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';

import { AvisoPrivasidadComponent } from '../../../components/modal/aviso-privasidad/aviso-privasidad.component';

@Component({
  selector: 'app-pop-up',
  templateUrl: './pop-up.component.html',
  styleUrls: ['./pop-up.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})

export class PopUpComponent implements OnInit {
  @Input() onFunction!: () => void;
  form!: FormGroup;
  urlActual: string = '';

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private generalService: GeneralService
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      consentimiento1: [null, Validators.required],
      consentimiento2: [null, Validators.required],
    });
    const baseUrl = window.location.href;
    // const baseUrl = window.location.origin;
    this.urlActual = `${baseUrl}?modal=terminos`;
    // console.log(baseUrl)
  }

  async enviarConsentimiento() {
    // Convertir valores a booleanos reales (por si llegan como strings)
    const consentimiento1 =
      this.form.value.consentimiento1 === true ||
      this.form.value.consentimiento1 === 'true';
    const consentimiento2 =
      this.form.value.consentimiento2 === true ||
      this.form.value.consentimiento2 === 'true';

    // Validación incompleta
    if (
      this.form.value.consentimiento1 === null ||
      this.form.value.consentimiento2 === null
    ) {
      this.generalService.alert(
        'Consentimiento Incompleto',
        'Selecciona una opción en ambos apartados para continuar.',
        'warning'
      );
      return;
    }

    // Ambos aceptaron
    if (consentimiento1 && consentimiento2) {
      this.modalCtrl.dismiss(true);
      return;
    }

    this.cerrar();
  }

  cerrar() {
    this.generalService.alert(
      'Consentimiento Denegado',
      'No podemos continuar si no aceptas ambos términos de privacidad.',
      'danger'
    );
    setTimeout(() => {
      this.modalCtrl.dismiss(false);
      window.location.reload();
    }, 2000);
  }

  async abrirModalAviso() {
    // this.modalCtrl.dismiss(false);

    setTimeout(async () => {
      const modal = await this.modalCtrl.create({
        component: AvisoPrivasidadComponent,
        backdropDismiss: false,
        showBackdrop: true,
        componentProps: {
          onAceptar: () => {
            console.log('Aviso aceptado desde modal');
          },
          onCancelar: () => {
            console.log('Modal cancelado');
          },
        },
      });
      await modal.present();
    }, 1000);
  }
}
