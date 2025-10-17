

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
  selector: 'app-renta-coches',
  templateUrl: './renta-coches.page.html',
  styleUrls: ['./renta-coches.page.scss'],
  standalone: false
})
export class RentaCochesPage implements OnInit {
  overlayLoaded = false;
  imgenPrincipal: string = '';

  constructor(
    private popoverCtrl: PopoverController,
    private alertCtrl: AlertController,
    private router: Router,
    private generalService: GeneralService,
    public carsService: CarsService) { }

  ngOnInit() {
    this.cargaimagen();
    // this.generalService.aplicarAnimacionPorScroll(
    //   '.eyebrow'
    // );
  }
  async cargaimagen() {
    this.imgenPrincipal = '/assets/autos/publicidad/renta.webp';
    this.generalService.addPreload(this.imgenPrincipal, 'image');
    try {
      await Promise.all([
        this.generalService.preloadHero(this.imgenPrincipal, 4500),
      ]);
    } finally {
    }
  }

}