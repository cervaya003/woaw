import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, PopoverController } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { GeneralService } from '../../services/general.service';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-menu-vehiculos',
  templateUrl: './menu-vehiculos.component.html',
  styleUrls: ['./menu-vehiculos.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class MenuVehiculosComponent implements OnInit {
  tipoVehiculo: 'Autos' | 'Motos' | 'Camiones' = 'Autos';
  private popoverCtrl = inject(PopoverController);
  esDispositivoMovil: boolean = false;

  constructor(
    private router: Router,
    private generalService: GeneralService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });
  }

  redirecion(ruta: string) {
    this.router.navigate([ruta]).then(() => {
      this.popoverCtrl.dismiss().catch(() => {});
      this.modalCtrl.dismiss().catch(() => {});
    });
  }
}
