import { Component, OnInit, ViewChildren, ElementRef, QueryList, } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { GeneralService } from '../../../services/general.service';
import { CarsService } from '../../../services/cars.service';
import { PopoverController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, FormArray, FormControl } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { SeguroService } from '../../../services/seguro.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-poliza',
  templateUrl: './poliza.page.html',
  styleUrls: ['./poliza.page.scss'],
  standalone: false
})
export class PolizaPage implements OnInit {
  mostrar_spinnet = false;
  currentStepform: 1 | 2 | 3 | 4 = 1;
  form_poliza: FormGroup;

  datosCoche: any = null;
  datosUsuario: any = null;
  datoscotizacion: any = null;
  UsuarioRespuesta: any = null;

  colorOpts = [
    { value: 'blanco', label: 'Blanco' },
    { value: 'negro', label: 'Negro' },
    { value: 'gris', label: 'Gris' },
    { value: 'rojo', label: 'Rojo' },
    { value: 'azul', label: 'Azul' },
    { value: 'verde', label: 'Verde' },
    { value: 'amarillo', label: 'Amarillo' },
    { value: 'naranja', label: 'Naranja' },
    { value: 'morado', label: 'Morado' },
    { value: 'plateado', label: 'Plateado' },
    { value: 'dorado', label: 'Dorado' },
  ];

  constructor(
    private menu: MenuController,
    public generalService: GeneralService,
    private popoverCtrl: PopoverController,
    public carsService: CarsService,
    private modalCtrl: ModalController,
    private router: Router,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private seguros: SeguroService,
    private location: Location
  ) {
    this.form_poliza = this.fb.group({
      vin: ['', Validators.required],
      placas: ['', Validators.required],
      color: ['', Validators.required],
      correos: this.fb.array([], [this.duplicatedEmailsValidator])
    });
  }

  ngOnInit() {
    const nav = this.router.getCurrentNavigation();

    // === cotización ===
    const cotizacion = localStorage.getItem('cotizacion');
    if (cotizacion) {
      this.datoscotizacion = JSON.parse(cotizacion);
      console.log('Cotización cargada:', this.datoscotizacion);
    } else {
      this.datoscotizacion = null;
      this.router.navigate(['/seguros']);
      this.generalService.alert(
        'Debes cotizar un coche antes de continuar con tu registro.',
        'Atención',
        'warning'
      );
    }

    // === datosCoche ===
    const datosCoche = nav?.extras?.state?.['datosCoche'] || null;
    if (datosCoche) {
      this.datosCoche = datosCoche;
      localStorage.setItem('datosCoche', JSON.stringify(datosCoche));
      console.log('DATOS - coche ', this.datosCoche);
    } else {
      const storedAuto = localStorage.getItem('datosCoche');
      if (storedAuto) {
        this.datosCoche = JSON.parse(storedAuto);
        console.log('DATOS - coche ', this.datosCoche);
      } else {
        this.datosCoche = null;
        this.router.navigate(['/seguros/persona']);
        this.generalService.alert(
          'Debes de cotizar un aut antes de continuar.',
          'Atención',
          'warning'
        );
        return;
      }
    }

    // === UsuarioRespuesta ===
    const UsuarioRespuesta = nav?.extras?.state?.['UsuarioRespuesta'] || null;
    if (UsuarioRespuesta) {
      this.UsuarioRespuesta = UsuarioRespuesta;
      localStorage.setItem('UsuarioRespuesta', JSON.stringify(UsuarioRespuesta));
      console.log('DATOS - PERSONALES RESPUESTA ', this.UsuarioRespuesta);
    } else {
      const storedPersona = localStorage.getItem('UsuarioRespuesta');
      if (storedPersona) {
        this.UsuarioRespuesta = JSON.parse(storedPersona);
        console.log('DATOS - PERSONALES RESPUESTA ', this.UsuarioRespuesta);
      } else {
        this.UsuarioRespuesta = null;
        this.router.navigate(['/seguros/persona']);
        this.generalService.alert(
          'Debes de llenar tus datos personales.',
          'Atención',
          'warning'
        );
        return;
      }
    }

    // === datosUsuario ===
    const datosUsuario = nav?.extras?.state?.['datosUsuario'] || null;
    if (datosUsuario) {
      this.datosUsuario = datosUsuario;
      localStorage.setItem('datosUsuario', JSON.stringify(datosUsuario));
      console.log('DATOS - PERSONALES ', this.datosUsuario);
    } else {
      const storedPersona = localStorage.getItem('datosUsuario');
      if (storedPersona) {
        this.datosUsuario = JSON.parse(storedPersona);
        console.log('DATOS - PERSONALES ', this.datosUsuario);
      } else {
        this.datosUsuario = null;
        this.router.navigate(['/seguros/persona']);
        this.generalService.alert(
          'Debes de llenar tus datos personales.',
          'Atención',
          'warning'
        );
        return;
      }
    }
  }

  // ====== Correos dinámicos ======

  get correos(): FormArray<FormControl<string | null>> {
    return this.form_poliza.get('correos') as FormArray<FormControl<string | null>>;
  }

  get canAddCorreo(): boolean {
    return this.correos.length < 2;
  }

  addCorreo(): void {
    if (!this.canAddCorreo) return;
    this.correos.push(
      this.fb.control<string>('', [Validators.required, Validators.email])
    );
    this.correos.updateValueAndValidity({ emitEvent: false });
  }

  removeCorreo(index: number): void {
    if (index < 0 || index >= this.correos.length) return;
    this.correos.removeAt(index);
    this.correos.updateValueAndValidity({ emitEvent: false });
  }

  normalizeCorreo(index: number): void {
    const c = this.correos.at(index);
    const v = (c.value ?? '').toString().trim().toLowerCase();
    if (v !== c.value) c.setValue(v, { emitEvent: false });
  }

  duplicatedEmailsValidator = (ctrl: AbstractControl): ValidationErrors | null => {
    const arr = ctrl as FormArray;
    const values: string[] = (arr.value || [])
      .filter((v: any) => typeof v === 'string' && v.trim().length > 0)
      .map((v: string) => v.trim().toLowerCase());

    const set = new Set(values);
    const duplicated = set.size !== values.length;
    return duplicated ? { duplicated: true } : null;
  };

  getCorreoError(errors: ValidationErrors | null): string {
    if (!errors) return '';
    if (errors['required']) return 'Este campo es obligatorio.';
    if (errors['email']) return 'Formato de correo inválido.';
    return 'Revisa este correo.';
  }

  // ====== Utilidades existentes ======

  toUpper(ctrlName: string) {
    const c = this.form_poliza.get(ctrlName);
    if (!c) return;
    const v = (c.value ?? '').toString().toUpperCase();
    if (v !== c.value) c.setValue(v, { emitEvent: false });
  }

  analizaForm(campo: string): boolean {
    const control = this.form_poliza.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  siguiente() {
    if (this.form_poliza.invalid) {
      this.form_poliza.markAllAsTouched();
      return;
    }

    const rfc = this.datosUsuario?.person?.rfc;
    const id = this.datoscotizacion.id;
    const idPlan = this.datoscotizacion.plans[0]?.id;

    // const start_date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    //   .toISOString()
    //   .slice(0, 10);

    const start_date = new Date(Date.now() + 24 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

    const receivers = ((this.correos?.value as Array<string | null>) ?? [])
      .filter((v): v is string => !!v && v.trim().length > 0)
      .map(v => v.trim().toLowerCase());

    const payload = {
      rfc,
      vehicle: {
        vin: this.form_poliza.get('vin')?.value,
        plates: this.form_poliza.get('placas')?.value,
        color: this.form_poliza.get('color')?.value
      },
      quotation: {
        id: id,
        plan_id: idPlan
      },
      preferred_beneficiary: true,
      receivers,
      start_date,
      use_crabi_checkout: false,
      send_mail_to_client: true,
      send_whatsapp_to_client: true
    };
    this.enviarDatosCrearPersona(payload);
    localStorage.setItem('datosPolizaVin', JSON.stringify(payload));
    console.log('Payload de la póliza:', payload);
  }

  enviarDatosCrearPersona(payload: any) {
    this.mostrar_spinnet = true;
    this.seguros.crearPoliza(payload).subscribe({
      next: (data) => {
        const nombre = data.response?.first_name || this.form_poliza.get('nombre')?.value || 'Tu registro';
        this.generalService.alert(
          `¡Listo! La póliza de ${nombre} se creó correctamente.`,
          'Registro exitoso',
          'success'
        );
        localStorage.setItem('datosPolizaVin_Respuesta', JSON.stringify(data));
        this.mostrar_spinnet = false;
      },
      error: (error) => {
        this.mostrar_spinnet = false;
        console.error('Error al crear la póliza:', error);
        this.generalService.alert(
          'Ocurrió un error al crear la póliza. Intenta nuevamente más tarde.',
          'Error',
          'danger'
        );
      }
    });
  }
}