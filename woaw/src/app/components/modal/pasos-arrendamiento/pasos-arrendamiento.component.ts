import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { GeneralService } from '../../../services/general.service';
import { ContactosService } from 'src/app/services/contactos.service';

@Component({
  selector: 'app-pasos-arrendamiento',
  templateUrl: './pasos-arrendamiento.component.html',
  styleUrls: ['./pasos-arrendamiento.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class PasosArrendamientoComponent implements OnInit {
  constructor(
    private modalCtrl: ModalController,
    private contactosService: ContactosService
  ) {}

  ngOnInit() {}

  cerrarModal() {
    this.modalCtrl.dismiss();
  }

  solicitarInformacion() {
    this.contactosService.enviarWhatsappInteresGeneral();
  }
}
