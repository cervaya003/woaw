import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Router, NavigationStart } from '@angular/router';
import { GeneralService } from '../../services/general.service';
import { AlertController } from '@ionic/angular';

import { ModalController } from '@ionic/angular';
// Importamos la modal de perfil
import { PerfilComponent } from '../modal/perfil/perfil.component';

@Component({
  selector: 'app-custom-alert',
  templateUrl: './custom-alert.component.html',
  styleUrls: ['./custom-alert.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class CustomAlertComponent implements OnInit {
  @Input() title!: string;
  @Input() message!: string;
  @Input() type: 'success' | 'danger' | 'warning' = 'success';
  @Input() icon: string = '';

  constructor(private modalCtrl: ModalController) {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  ngOnInit() {}
}
