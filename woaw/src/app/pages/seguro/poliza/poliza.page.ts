import { Component, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { GeneralService } from '../../../services/general.service';
import { CarsService } from '../../../services/cars.service';
import { ListComponent } from '../../../components/filtos/list/list.component';
import { PopoverController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

import { IonContent } from '@ionic/angular';
import { ViewChild } from '@angular/core';

import { MotosService } from '../../../services/motos.service';
@Component({
  selector: 'app-poliza',
  templateUrl: './poliza.page.html',
  styleUrls: ['./poliza.page.scss'],
  standalone: false
})
export class PolizaPage implements OnInit {
  esDispositivoMovil: boolean = false;
  form_poliza: FormGroup;
  currentStep = 1;
  datosPoliza: any = null;
  tipoPersonaSeleccionada: string | null = null;

  constructor(
    private menu: MenuController,
    public generalService: GeneralService,
    private popoverCtrl: PopoverController,
    public carsService: CarsService,
    private modalCtrl: ModalController,
    private router: Router,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private motosService: MotosService
  ) {
    this.form_poliza = this.fb.group({
      tipoPersona: [null, Validators.required],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellidoP: ['', [Validators.required, Validators.minLength(2)]],
      apellidoM: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit() {
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });

    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state?.['datos']) {
      console.log('Datos recibidos:', nav.extras.state['datos']);
      this.datosPoliza = nav.extras.state['datos'];
    }
  }

  siguiente() { }

  goPaso2() {
    const tipo = this.form_poliza.get('tipoPersona')?.value;
    if (tipo) {
      this.tipoPersonaSeleccionada = tipo;
      this.currentStep = 2;
      if (tipo === 'fisica') {
        this.form_poliza.addControl('apellidoP', this.fb.control('', [Validators.required, Validators.minLength(2)]));
        this.form_poliza.addControl('apellidoM', this.fb.control('', [Validators.required, Validators.minLength(2)]));
        this.form_poliza.addControl('rfc', this.fb.control('', [Validators.required, Validators.minLength(2)]));
        this.form_poliza.addControl('curp', this.fb.control('', [Validators.required, Validators.minLength(2)]));
      }
    }
  }

  goPaso1() {
    this.currentStep = 1;
    if (this.form_poliza.contains('apellidoP')) {
      this.form_poliza.removeControl('apellidoP');
    }
    if (this.form_poliza.contains('apellidoM')) {
      this.form_poliza.removeControl('apellidoM');
    }
    if (this.form_poliza.contains('rfc')) {
      this.form_poliza.removeControl('rfc');
    }
    if (this.form_poliza.contains('curp')) {
      this.form_poliza.removeControl('curp');
    }
    this.tipoPersonaSeleccionada = null;
  }

  toUpper(ctrlName: string) {
    const c = this.form_poliza.get(ctrlName);
    if (!c) return;
    const v = (c.value ?? '').toString().toUpperCase();
    if (v !== c.value) c.setValue(v, { emitEvent: false });
  }

}
