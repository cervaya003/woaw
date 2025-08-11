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

import { ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-politicas',
  templateUrl: './politicas.component.html',
  styleUrls: ['./politicas.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class PoliticasComponent implements OnInit {
  @Input() onAceptar!: () => void;
  @Input() onCancelar!: () => void;
  mostrarFooter: boolean = false;
  scrollAlFinal = false;

  @ViewChild('contenidoPrivacidad', { static: false }) contentRef!: IonContent;

  constructor(
    private modalCtrl: ModalController,
    private generalService: GeneralService
  ) {}

  ngOnInit() {
    const terminosAceptados = localStorage.getItem('terminos') === 'true';
    console.log('terminos -- ', terminosAceptados);

    if (terminosAceptados) {
      this.mostrarFooter = true;
    }
  }

  async cerrarModal() {
    this.modalCtrl.dismiss();
  }

  aceptar() {
    if (this.onAceptar) this.onAceptar();
    this.modalCtrl.dismiss();
  }

  cancelar() {
    if (this.onCancelar) this.onCancelar();
    this.modalCtrl.dismiss();
  }

  async verificarScroll() {
    const scrollElement = await this.contentRef.getScrollElement();

    const scrollTop = scrollElement.scrollTop;
    const scrollHeight = scrollElement.scrollHeight;
    const offsetHeight = scrollElement.offsetHeight;

    const haLlegadoAlFinal = scrollTop + offsetHeight >= scrollHeight - 20;

    if (haLlegadoAlFinal) {
      this.scrollAlFinal = true;
    }
  }
}
