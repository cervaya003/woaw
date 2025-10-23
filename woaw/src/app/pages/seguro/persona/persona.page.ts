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
import { Location } from '@angular/common';
import { IonContent } from '@ionic/angular';
import { ViewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';


import { MotosService } from '../../../services/motos.service';
@Component({
  selector: 'app-persona',
  templateUrl: './persona.page.html',
  styleUrls: ['./persona.page.scss'],
  standalone: false
})
export class PersonaPage implements OnInit {
  form_poliza: FormGroup;
  currentStepform: 1 | 2 | 3 | 4 = 1;
  datosCoche: any = null;
  datoscotizacion: any = null;
  UsuarioRespuesta: any = null;
  statusUserDtos: boolean = false;
  statusBuscar: boolean = false;
  tipoPersonaSeleccionada: string | null = null;
  mostrarMasOpciones: boolean = false;

  public tipoDispocitivo: 'computadora' | 'telefono' | 'tablet' = 'computadora';
  private idActividadExtra: string = '0'
  buscarForm!: FormGroup;

  public isLoggedIn: boolean = false;

  paises: any[] = [];
  estados: any[] = [];
  ActEconomicas: any[] = [];

  islandKey = 0;

  mostrar_spinnet: boolean = false;

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
    private seguros: SeguroService,
    private location: Location
  ) {
    this.form_poliza = this.fb.group({
      tipoPersona: [null, Validators.required]
    });

    this.buscarForm = this.fb.group({
      valuebuscar: [
        '',
        {
          validators: [
            Validators.required,
            Validators.minLength(5),
            Validators.maxLength(30)
          ],
          updateOn: 'change'
        }
      ],
    });
  }
  ngOnInit() {
    this.islandKey++;
    this.detectaUsuario();

    this.generalService.dispositivo$.subscribe((tipo) => {
      this.tipoDispocitivo = tipo;
    });

    const stored = localStorage.getItem('datosCoche');
    if (stored) {
      this.datosCoche = JSON.parse(stored);
    } else {
      this.datosCoche = null;
    }
    const cotizacion = localStorage.getItem('cotizacion');
    if (cotizacion) {
      this.datoscotizacion = cotizacion;
    } else {
      // this.router.navigate(['/seguros/atuos']);
      // this.generalService.alert(
      //   'Debes cotizar un coche antes de continuar con tu registro.',
      //   'Atención',
      //   'warning'
      // );
    }
  }
  onBuscar(status: boolean = true, val: string = ''): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.buscarForm.invalid && status) {
        this.generalService.alert(
          `Ingresa tu RFC o Email`,
          'Ingresa tus datos',
          'danger'
        );
        return resolve(false);
      }

      let value: string = status ? this.buscarForm.value.valuebuscar : val;

      this.mostrar_spinnet = true;
      this.seguros.buscarPersona(value).subscribe({
        next: (data: any) => {
          this.mostrar_spinnet = false;
          this.islandKey++;

          if (data?.found === false) {
            if (status) {
              this.generalService.alert(
                `${value} no fue encontrado`,
                'No existe',
                'danger'
              );
            }
            return resolve(false);
          }

          localStorage.setItem('UsuarioRespuesta', JSON.stringify(data));
          this.statusBuscar = false;
          this.detectaUsuario();
          this.generalService.alert(
            `${value} fue encontrado correctamente`,
            'Usuario localizado',
            'success'
          );
          this.seguros.contador('llenoDatos');
          this.form_poliza.reset();
          return resolve(true);
        },
        error: (error) => {
          this.mostrar_spinnet = false;
          console.error('Error al obtener persona:', error);
          this.generalService.alert(
            'Ocurrió un error al consultar Crabi. Intenta nuevamente más tarde.',
            'Error',
            'danger'
          );
          return reject(error);
        }
      });
    });
  }
  buscarSeccion() {
    this.statusBuscar = !this.statusBuscar;
  }
  detectaUsuario() {
    this.islandKey++;
    if (this.bustasUserBoleano()) {
      this.statusUserDtos = true;
      const storedPersona = localStorage.getItem('UsuarioRespuesta');
      if (storedPersona) {
        this.UsuarioRespuesta = JSON.parse(storedPersona);
      }
    } else {
      this.UsuarioRespuesta = null;
      this.statusUserDtos = false;
      return;
    }
  }
  bustasUserBoleano(): boolean {
    const storedPersona = localStorage.getItem('UsuarioRespuesta');
    return !!(storedPersona && storedPersona.trim() !== '');
  }
  async nuevosDatos() {
    // this.mostrar_spinnet = true;

    // setTimeout(async () => {
    //   this.mostrar_spinnet = false;

    // const autorizado = await this.verificarAuth();

    // if (autorizado) {
    this.router.navigate(['/seguros/poliza']);
    //   } else {
    //     this.generalService.alert(
    //       `Para crear tu póliza, es necesario que inicies sesión.`,
    //       'Regístrate o inicia sesión',
    //       'danger'
    //     );
    //     this.router.navigate(['/inicio']);
    //   }
    // }, 1500);
  }
  editarUser() {
    this.statusUserDtos = false;
  }
  async siguiente() {
    if (this.form_poliza.invalid) {
      this.form_poliza.markAllAsTouched();
      return;
    }
    if (this.currentStepform === 1) {
      const tipo = this.form_poliza.get('tipoPersona')?.value;
      this.tipoPersonaSeleccionada = tipo;
      this.currentStepform = 2;
      this.form_poliza.addControl('telefono', this.fb.control('', [Validators.required, Validators.pattern(/^\d{10}$/)]));
      this.form_poliza.addControl('calle', this.fb.control('', [Validators.required, Validators.minLength(1)]));
      this.form_poliza.addControl('int', this.fb.control(''));
      this.form_poliza.addControl('ext', this.fb.control('', [Validators.required, Validators.minLength(1)]));
      this.form_poliza.addControl('col', this.fb.control('', [Validators.required, Validators.minLength(1)]));
    } else if (this.currentStepform === 2) {
      this.currentStepform = 3;
      // siempre se creaen estos 
      this.form_poliza.addControl('nombre', this.fb.control('', [Validators.required, Validators.minLength(1)]));
      this.form_poliza.addControl('email', this.fb.control('', [Validators.required, Validators.email]));
      this.form_poliza.addControl('rfc', this.fb.control('', [Validators.required, Validators.minLength(10)]));
      if (this.tipoPersonaSeleccionada === 'fisica') {
        // solo si es fisico 
        this.form_poliza.addControl('apellidoP', this.fb.control('', [Validators.required, Validators.minLength(1)]));
        this.form_poliza.addControl('apellidoM', this.fb.control('', [Validators.required, Validators.minLength(1)]));
        this.form_poliza.addControl('curp', this.fb.control('', [Validators.required, Validators.minLength(10)]));
      }
      if (this.tipoPersonaSeleccionada === 'moral') {
        // solo si es moral 
        this.form_poliza.addControl('folio', this.fb.control('', [Validators.required, Validators.minLength(5)]));
        this.form_poliza.addControl('nmRepLegal', this.fb.control('', [Validators.required, Validators.minLength(3)]));
      }
    } else if (this.currentStepform === 3) {
      const email = String(this.form_poliza.value.email || '').trim();
      const rfc = String(this.form_poliza.value.rfc || '').trim();

      try {
        let existeEmail = true;
        let existeRFC = true;

        if (email) {
          existeEmail = await this.onBuscar(false, email);
        }

        if (!existeEmail && rfc) {
          existeRFC = await this.onBuscar(false, rfc);
        }

        if (!existeEmail && !existeRFC) {
          this.obtenerPaises();
          this.obtenerEstados();
          this.obtenerActEconomicas();
          this.currentStepform = 4;
          this.form_poliza.addControl('pais', this.fb.control({ value: 1, disabled: true }, Validators.required));
          this.form_poliza.addControl('estado', this.fb.control('', [Validators.required]));
          this.form_poliza.addControl('actE', this.fb.control('', [Validators.required]));
        } else {
          return;
        }
      } catch (e) {
        this.generalService.alert(
          'Ocurrió un error al consultar. Intenta nuevamente.',
          'Error',
          'danger'
        );
        console.error(e);
        return;
      }

    } else if (this.currentStepform === 4) {
      this.generalService.confirmarAccion(
        '¿Autorizas enviar tu datos par acrear tu registro?',
        'Envir datos',
        async () => {
          this.prepararDatos();
        }
      );
    }
  }
  analizaForm(campo: string): boolean {
    const control = this.form_poliza.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
  regresar() {
    this.detectaUsuario();
    let controlesAEliminar: string[] = [];
    if (this.currentStepform === 1) {
      if (this.bustasUserBoleano()) {
        this.statusUserDtos = true;
      } else {
        this.islandKey++;
        this.router.navigate(['/seguros/autos']);
      }
    } else if (this.currentStepform === 2) {
      this.currentStepform = 1;
      controlesAEliminar = [
        'telefono', 'calle', 'int', 'ext', 'col'
      ];
    } else if (this.currentStepform === 3) {
      this.tipoPersonaSeleccionada = null;
      this.currentStepform = 2;
      controlesAEliminar = [
        'nombre', 'email', 'rfc',
        'apellidoP', 'apellidoM', 'curp', 'folio', 'nmRepLegal'
      ];
    } else if (this.currentStepform === 4) {
      this.currentStepform = 3;
      this.mostrarMasOpciones = false;
      controlesAEliminar = [
        'pais', 'estado', 'actE', 'actEextra'
      ];
    }
    controlesAEliminar.forEach(c => {
      if (this.form_poliza.contains(c)) this.form_poliza.removeControl(c);
    });
  }
  regresarInicio() {
    this.detectaUsuario();
    this.islandKey++;
    this.router.navigate(['/seguros/autos']);
  }
  toUpper(ctrlName: string) {
    const c = this.form_poliza.get(ctrlName);
    if (!c) return;
    const v = (c.value ?? '').toString().toUpperCase();
    if (v !== c.value) c.setValue(v, { emitEvent: false });
  }
  onActividadChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    console.log(this.form_poliza.get('actE')?.value, selectedValue)
    if (selectedValue === this.idActividadExtra) {
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
    if (actE === this.idActividadExtra) {
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
    const gender_code = generoMap[(this.datosCoche?.genero || '').toLowerCase()] ?? 0;
    const civil_status_code = estadoCivilMap[(this.datosCoche?.estadoCivil || '').toLowerCase()] ?? 0;

    const nacimiento = this.datosCoche?.nacimiento;
    let birthdate: string | null = null;
    if (nacimiento?.anio && nacimiento?.mes && nacimiento?.dia) {
      const pad2 = (n: number) => String(n).padStart(2, '0');
      birthdate = `${nacimiento.anio}-${pad2(nacimiento.mes)}-${pad2(nacimiento.dia)}`;
    }

    const postal_code = String(this.datosCoche?.cp ?? '');
    const nationality_code = 1;
    const country_of_origin_code = Number(this.form_poliza.get('pais')?.value ?? 1);
    const state_of_origin_code = Number(this.form_poliza.get('estado')?.value ?? 0);
    const economic_activity_code = Number(
      actE === this.idActividadExtra
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
        internal_number: this.form_poliza.get('int')?.value?.trim() || 'SN',
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
  getActividadesPrincipales() {
    const idsRequeridos = [8944098, 9506009, 9411998, 0];
    return this.ActEconomicas.filter(a => idsRequeridos.includes(a._id));
  }

  getActividadesSecundarias() {
    const idsRequeridos = [8944098, 9506009, 9411998, 0];
    return this.ActEconomicas.filter(a => !idsRequeridos.includes(a._id));
  }
  async enviarDatosCrearPersona(payload: any) {
    this.mostrar_spinnet = true;

    try {
      const data = await firstValueFrom(this.seguros.crearPersona(payload));

      const autorizado = await firstValueFrom(
        this.generalService.tokenExistente$.pipe(take(1))
      );

      this.islandKey++;
      const nombre =
        data?.response?.first_name ||
        this.form_poliza.get('nombre')?.value;

      this.mostrar_spinnet = false;

      this.generalService.alert(
        `¡Listo! ${nombre} quedó registrado correctamente.`,
        'Registro exitoso',
        'success'
      );
      this.seguros.contador('llenoDatos');
      localStorage.setItem('UsuarioRespuesta', JSON.stringify(data));
      this.router.navigate(['/seguros/poliza']);

    } catch (error: any) {
      this.mostrar_spinnet = false;
      console.error('Error al crear persona:', error);
      const msg = error?.error?.message || 'No se pudo registrar a la persona.';
      this.generalService.alert(msg, 'Error', 'danger');
    }
  }
  async verificarAuth(): Promise<boolean> {
    return new Promise((resolve) => {
      this.generalService.tokenExistente$.subscribe((estado) => {
        this.isLoggedIn = estado;
        resolve(estado);
      });
    });
  }
  public olvidarUser() {
    this.mostrar_spinnet = true;
    setTimeout(() => {
      localStorage.removeItem('UsuarioRespuesta');
      this.islandKey++;
      this.mostrar_spinnet = false;
      this.router.navigate(['/seguros/autos']);
      window.location.reload();
    }, 1000);
  }
  ionViewWillEnter() {
  }
}
