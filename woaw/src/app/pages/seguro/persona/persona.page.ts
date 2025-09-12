import { Component, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { GeneralService } from '../../../services/general.service';
import { CarsService } from '../../../services/cars.service';
import { ListComponent } from '../../../components/filtos/list/list.component';
import { PopoverController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { SeguroService } from '../../../services/seguro.service';

import { IonContent } from '@ionic/angular';
import { ViewChild } from '@angular/core';

import { MotosService } from '../../../services/motos.service';
@Component({
  selector: 'app-persona',
  templateUrl: './persona.page.html',
  styleUrls: ['./persona.page.scss'],
  standalone: false
})
export class PersonaPage implements OnInit {
  esDispositivoMovil: boolean = false;
  form_poliza: FormGroup;
  currentStepform: 1 | 2 | 3 | 4 = 1;
  datosPoliza: any = null;
  tipoPersonaSeleccionada: string | null = null;
  mostrarMasOpciones: boolean = false;

  paises: any[] = [];
  estados: any[] = [];
  ActEconomicas: any[] = [];

  constructor(
    private menu: MenuController,
    public generalService: GeneralService,
    private popoverCtrl: PopoverController,
    public carsService: CarsService,
    private modalCtrl: ModalController,
    private router: Router,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private motosService: MotosService,
    private seguros: SeguroService
  ) {
    this.form_poliza = this.fb.group({
      tipoPersona: [null, Validators.required]
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
  siguiente() {
    if (this.form_poliza.invalid) {
      this.form_poliza.markAllAsTouched();
      return;
    }
    if (this.currentStepform === 1) {
      this.currentStepform = 2;
      const tipo = this.form_poliza.get('tipoPersona')?.value;
      this.tipoPersonaSeleccionada = tipo;
      // siempre se creaen estos 
      this.form_poliza.addControl('nombre', this.fb.control('', [Validators.required, Validators.minLength(4)]));
      this.form_poliza.addControl('email', this.fb.control('', [Validators.required, Validators.email]));
      this.form_poliza.addControl('rfc', this.fb.control('', [Validators.required, Validators.minLength(10)]));
      if (this.tipoPersonaSeleccionada === 'fisica') {
        // solo si es fisico 
        this.form_poliza.addControl('apellidoP', this.fb.control('', [Validators.required, Validators.minLength(4)]));
        this.form_poliza.addControl('apellidoM', this.fb.control('', [Validators.required, Validators.minLength(4)]));
        this.form_poliza.addControl('curp', this.fb.control('', [Validators.required, Validators.minLength(10)]));
      }
      if (this.tipoPersonaSeleccionada === 'moral') {
        // solo si es moral 
        this.form_poliza.addControl('folio', this.fb.control('', [Validators.required, Validators.minLength(5)]));
        this.form_poliza.addControl('nmRepLegal', this.fb.control('', [Validators.required, Validators.minLength(5)]));
      }
    } else if (this.currentStepform === 2) {
      this.currentStepform = 3;
      this.form_poliza.addControl('telefono', this.fb.control('', [Validators.required, Validators.pattern(/^\d{10}$/)]));
      this.form_poliza.addControl('calle', this.fb.control('', [Validators.required, Validators.minLength(5)]));
      this.form_poliza.addControl('int', this.fb.control('', [Validators.required, Validators.minLength(1)]));
      this.form_poliza.addControl('ext', this.fb.control('', [Validators.required, Validators.minLength(1)]));
      this.form_poliza.addControl('col', this.fb.control('', [Validators.required, Validators.minLength(5)]));
    } else if (this.currentStepform === 3) {
      this.obtenerPaises();
      this.obtenerEstados();
      this.obtenerActEconomicas();
      this.currentStepform = 4;
      this.form_poliza.addControl('pais', this.fb.control({ value: 1, disabled: true }, Validators.required));
      this.form_poliza.addControl('estado', this.fb.control('', [Validators.required]));
      this.form_poliza.addControl('actE', this.fb.control('', [Validators.required]));
    } else if (this.currentStepform === 4) {
      this.prepararDatos();
    }
  }
  analizaForm(campo: string): boolean {
    const control = this.form_poliza.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
  regresar() {
    let controlesAEliminar: string[] = [];
    if (this.currentStepform === 2) {
      this.tipoPersonaSeleccionada = null;
      this.currentStepform = 1;
      controlesAEliminar = [
        'nombre', 'email', 'rfc',
        'apellidoP', 'apellidoM', 'curp', 'folio', 'nmRepLegal'
      ];
    } else if (this.currentStepform === 3) {
      this.currentStepform = 2;
      controlesAEliminar = [
        'telefono', 'calle', 'int', 'ext', 'col'
      ];
    } else if (this.currentStepform === 4) {
      this.currentStepform = 3;
      controlesAEliminar = [
        'pais', 'estado', 'actE', 'actEextra'
      ];
    }
    controlesAEliminar.forEach(c => {
      if (this.form_poliza.contains(c)) this.form_poliza.removeControl(c);
    });
  }
  toUpper(ctrlName: string) {
    const c = this.form_poliza.get(ctrlName);
    if (!c) return;
    const v = (c.value ?? '').toString().toUpperCase();
    if (v !== c.value) c.setValue(v, { emitEvent: false });
  }
  onActividadChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    if (selectedValue === "0") {
      this.mostrarMasOpciones = true;
      if (!this.form_poliza.contains('actEextra')) {
        this.form_poliza.addControl('actEextra', this.fb.control('', [Validators.required]));
      }
    } else {
      this.mostrarMasOpciones = false;
      if (this.form_poliza.contains('actEextra')) {
        this.form_poliza.removeControl('actEextra');
      }
    }
  }
  async prepararDatos() {
    const actE = this.form_poliza.get('actE')?.value;
    if (actE === '0') {
      const actEextraCtrl = this.form_poliza.get('actEextra');
      if (!actEextraCtrl || !actEextraCtrl.value) {
        actEextraCtrl?.markAsTouched();
        return;
      }
    }
    const isFisica = this.tipoPersonaSeleccionada === 'fisica';
    const generoMap: Record<string, number> = {
      'hombre': 1,
      'mujer': 2
    };
    const estadoCivilMap: Record<string, number> = {
      'soltero': 1, 'soltero(a)': 1,
      'casado': 2, 'casado(a)': 2,
      'divorciado': 4, 'divorciado(a)': 4
    };
    const gender_code = generoMap[(this.datosPoliza?.genero || '').toLowerCase()] ?? 0;
    const civil_status_code = estadoCivilMap[(this.datosPoliza?.estadoCivil || '').toLowerCase()] ?? 0;
    const birthdate = this.toISODate(this.datosPoliza?.nacimiento);
    const postal_code = String(this.datosPoliza?.cp ?? '');
    const nationality_code = 1;
    const country_of_origin_code = Number(this.form_poliza.get('pais')?.value ?? 1);
    const state_of_origin_code = Number(this.form_poliza.get('estado')?.value ?? 0);
    const economic_activity_code = Number(
      actE === '0'
        ? this.form_poliza.get('actEextra')?.value
        : this.form_poliza.get('actE')?.value
    );
    const basePerson: any = {
      first_name: this.form_poliza.get('nombre')?.value,
      birthdate,
      rfc: this.form_poliza.get('rfc')?.value,
      email: this.form_poliza.get('email')?.value,
      phone: this.form_poliza.get('telefono')?.value,
      address: {
        street: this.form_poliza.get('calle')?.value,
        external_number: this.form_poliza.get('ext')?.value,
        internal_number: this.form_poliza.get('int')?.value,
        neighborhood: this.form_poliza.get('col')?.value,
        postal_code
      },
      pld_data: {
        nationality_code,
        country_of_origin_code,
        state_of_origin_code,
        economic_activity_code
      }
    };
    if (isFisica) {
      basePerson.gender_code = gender_code;
      basePerson.civil_status_code = civil_status_code;
      basePerson.first_last_name = this.form_poliza.get('apellidoP')?.value;
      basePerson.second_last_name = this.form_poliza.get('apellidoM')?.value;
      basePerson.curp = this.form_poliza.get('curp')?.value;
    } else {
      basePerson.moral_person = true;
      basePerson.mercantile_folio = this.form_poliza.get('folio')?.value;
      basePerson.legal_representative = this.form_poliza.get('nmRepLegal')?.value;
    }
    const payload = { person: basePerson };
    this.enviarDatosCrearPersona(payload);
  }
  private toISODate(input: any): string | null {
    if (!input) return null;

    if (typeof input === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
      const dmy = input.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
      if (dmy) {
        const [, dd, mm, yyyy] = dmy;
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }
      const ymd = input.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
      if (ymd) {
        const [, yyyy, mm, dd] = ymd;
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }
    }
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    return null;
  }
  // ----- PETICIONES ----- 
  obtenerPaises() {
    this.seguros.optenerPaises().subscribe({
      next: (data) => {
        this.paises = data;
      },
      error: (error) => console.error('Error al obtener paises:', error),
    });
  }
  obtenerEstados() {
    this.seguros.optenerEstados().subscribe({
      next: (data) => {
        this.estados = data;
      },
      error: (error) => console.error('Error al obtener estados:', error),
    });
  }
  obtenerActEconomicas() {
    this.seguros.optenerActEcon().subscribe({
      next: (data) => {
        this.ActEconomicas = data;
      },
      error: (error) => console.error('Error al obtener actividades economicas:', error),
    });
  }
  enviarDatosCrearPersona(payload: any) {
    this.seguros.crearPersona(payload).subscribe({
      next: (data) => {
        this.router.navigate(['/seguros/poliza'], { 
        state: { 
          datos: payload,
          respuesta: data 
        } 
      });
      },
      error: (error) => console.error('Error al obtener actividades economicas:', error),
    });
  }
}
