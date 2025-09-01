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
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-menu-vehiculos',
  templateUrl: './menu-vehiculos.page.html',
  styleUrls: ['./menu-vehiculos.page.scss'],
  standalone: false
})
export class MenuVehiculosPage implements OnInit {

  tipoVehiculo!: string;
  esDispositivoMovil: boolean = false;
  imgenPrincipal: string = '';

  categorias = [
    {
      title: 'Nuevos',
      desc: 'Unidades 0 km con garantía y equipamiento tope de línea.',
      href: '/nuevos',
      bg: 'nuevos',
      meta: { km: 0, precio: '—' },
      icon: this.svg('sparkles')
    },
    {
      title: 'Seminuevos',
      desc: 'Modelos recientes, historial claro y estado impecable.',
      href: '/seminuevos',
      bg: 'seminuevos',
      meta: { km: '25k', precio: '350k' },
      icon: this.svg('ribbon')
    },
    {
      title: 'Usados',
      desc: 'Grandes oportunidades con precio justo y mantenimiento al día.',
      href: '/usados',
      bg: 'usados',
      meta: { km: '65k', precio: '220k' },
      icon: this.svg('steering')
    }
  ];

  go(url: string) { this.router.navigateByUrl(url); }

  constructor(
    private route: ActivatedRoute,
    private popoverCtrl: PopoverController,
    private alertCtrl: AlertController,
    private router: Router,
    private generalService: GeneralService,
    public carsService: CarsService, private sanitizer: DomSanitizer
  ) { }

  private svg(name: 'sparkles' | 'ribbon' | 'steering'): SafeHtml {
    const common = 'width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
    const map: Record<string, string> = {
      sparkles: `<svg ${common}><path d="M12 2l1.6 3.6L17 7.2l-3.4 1.6L12 12l-1.6-3.2L7 7.2l3.4-1.6L12 2z"/><path d="M5 14l.9 2l2.1.9l-2 .9L5 20l-.9-2.1L2 17l2.1-.9L5 14z"/><path d="M19 10l.9 2l2.1.9l-2 .9L19 16l-.9-2.1L16 13l2.1-.9L19 10z"/></svg>`,
      ribbon: `<svg ${common}><path d="M12 2a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z"/><path d="M10 14l-5 8l7-4l7 4l-5-8"/></svg>`,
      steering: `<svg ${common}><circle cx="12" cy="12" r="9"/><path d="M4 12h16"/><path d="M12 12l4 7"/><path d="M12 12l-4 7"/></svg>`
    };
    return this.sanitizer.bypassSecurityTrustHtml(map[name]);
  }
  
  ngOnInit() {
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });
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
