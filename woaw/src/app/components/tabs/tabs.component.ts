import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Router, NavigationStart } from '@angular/router';
import { GeneralService } from '../../services/general.service';
import { PopoverController } from '@ionic/angular';
import { MenuVehiculosComponent } from '../../components/menu-vehiculos/menu-vehiculos.component';
import { ModalController } from '@ionic/angular';
import { NgZone } from '@angular/core';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TabsComponent implements OnInit {
  public isLoggedIn: boolean = false;
  esDispositivoMovil: boolean = false;

  constructor(
    private generalService: GeneralService,
    private router: Router,
    private popoverCtrl: PopoverController,
    private modalCtrl: ModalController,
    private zone: NgZone
  ) {}

  notificacionesFavoritos: number = 9;

  ngOnInit() {
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });
    // ---
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
  }

  async redirecion(url: string) {
    // this.router.navigate([url]);
    this.zone.run(() => {
      this.router.navigateByUrl('/' + url);
    });
  }

  isActive(ruta: string): boolean {
    const url = this.router.url;

    if (ruta === 'home') {
      return url === '/home' || url === '/';
    }

    return url === `/${ruta}` || url.startsWith(`/${ruta}/`);
  }

  async abrirPopover(event: any, tipo: 'Autos' | 'Motos' | 'Camiones') {
    const popover = await this.modalCtrl.create({
      component: MenuVehiculosComponent,
      componentProps: {
        tipoVehiculo: tipo,
      },
      breakpoints: [0, 0.3, 0.5, 0.7],
      initialBreakpoint: 0.5,
      cssClass: 'modal-perfil',
      handle: true,
      backdropDismiss: true,
      showBackdrop: true,
    });

    await popover.present();
  }
}

// const popover = await this.modalCtrl.create({
//   component: MenuVehiculosComponent,
//   componentProps: {
//     tipoVehiculo: tipo,
//   },
//   breakpoints: [0.2],
//   cssClass: 'modal-perfil',
//   initialBreakpoint: 0.2,
//   handle: true,
//   backdropDismiss: true,
//   showBackdrop: true,
// });

// await popover.present();
