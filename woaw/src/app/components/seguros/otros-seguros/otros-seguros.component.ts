import { Component, OnInit, OnChanges, Input, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { GeneralService } from "../../../services/general.service";
import { AppRoutingModule } from "src/app/app-routing.module";
import { Location } from '@angular/common';
import { ModalController } from '@ionic/angular';
import { PasosComponent } from '../pasos/pasos.component';
import { NgZone } from '@angular/core';

type Maybe<T> = T | null | undefined;

interface CotizacionVM {
  plan?: string;
  total?: number; // opcional 
  pagos?: string;
  vigencia?: { start?: string; end?: string };
  vehiculo?: string; // opcional
  policyNumbers?: string; // opcional (para la forma nueva)
}

@Component({
  selector: 'app-otros-seguros',
  templateUrl: './otros-seguros.component.html',
  styleUrls: ['./otros-seguros.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, PasosComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class OtrosSegurosComponent implements OnInit, OnChanges {

  @Input() refreshKey = 0;

  cotizacionVM: Maybe<CotizacionVM> = null;
  tipoDispocitivo: 'computadora' | 'telefono' | 'tablet' = 'computadora';

  cards = [
    { nombre: 'Cotización', estatus: false, icon: 'calculator-outline', key: 'cotizacion' },
    { nombre: 'Mis Datos', estatus: false, icon: 'person-outline', key: 'datos' },
    { nombre: 'Póliza', estatus: false, icon: 'document-text-outline', key: 'poliza' }
  ];

  usuarioVM: Maybe<{
    nombre: string;
    rfc: string;
    email?: string;
    phone?: string;
    direccion?: string;
  }> = null;

  polizaVM: Maybe<{
    rfc: string;
    vin?: string;
    placas?: string;
    color?: string;
    quotationId?: string;
    planId?: string;
    inicio?: string;
  }> = null;

  constructor(
    private cdr: ChangeDetectorRef, private router: Router,
    public generalService: GeneralService,
    public modalCtrl: ModalController,
    private location: Location,
    private ngZone: NgZone
  ) {

  }

  ngOnInit() {
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.tipoDispocitivo = tipo;
    });
  }
  ngOnChanges(): void {

  }
  redireccion(url: string) {
    if (!url) return;
    this.router.navigate([`/${url}`]);
  }
  async abrirModalPasos() {

    this.ngZone.runOutsideAngular(async () => {
      try {
        const modalPasos = await this.modalCtrl.create({
          component: PasosComponent,
          componentProps: {
            cards: this.cards,
            cotizacionVM: this.cotizacionVM,
            usuarioVM: this.usuarioVM,
            polizaVM: this.polizaVM,
          },
          breakpoints: [0, 0.5, 0.7, 0.8],
          initialBreakpoint: 0.7,
          cssClass: 'modal-pasos-seguros',
          handle: true,
          showBackdrop: true,
        });
        await modalPasos.present();

      } catch (error) {
        console.error('❌ Error en abrirModalPasos:', error);
      }
    });
  }
  public atras() {
    this.location.back();
  }
}