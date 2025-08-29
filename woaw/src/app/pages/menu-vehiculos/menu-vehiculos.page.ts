import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { PopoverController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AlertController } from '@ionic/angular';
import { Router, NavigationEnd } from '@angular/router';
import { AfterViewInit, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CarsService } from '../../services/cars.service';
import { GeneralService } from '../../services/general.service';
import { HistorealSearchComponent } from '../../components/historeal-search/historeal-search.component';

@Component({
  selector: 'app-menu-vehiculos',
  templateUrl: './menu-vehiculos.page.html',
  styleUrls: ['./menu-vehiculos.page.scss'],
  standalone: false
})
export class MenuVehiculosPage implements OnInit {

  tipoVehiculo!: string;

  imgenPrincipal: string = '';

  constructor(
    private route: ActivatedRoute,
    private popoverCtrl: PopoverController,
    private alertCtrl: AlertController,
    private router: Router,
    private generalService: GeneralService,
    public carsService: CarsService
  ) { }

  ngOnInit() {
    this.cargaimagen();
    this.tipoVehiculo = this.route.snapshot.paramMap.get('tipo') || '';
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
  verMas(url: string) {
    this.router.navigate([url]);
  }
}
