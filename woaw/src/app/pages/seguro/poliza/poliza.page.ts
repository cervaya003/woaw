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

import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';


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
  polizaCreada: boolean = false;
  datosPolizaCreada: any = null;
  email: any = null;

  islandKey = 0;

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
      vin: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[A-HJ-NPR-Z0-9]{17}$/)
        ]
      ],
      placas: [
        '',
        [
          Validators.required,
          this.placasMxValidator
        ]
      ],
      color: ['', Validators.required],
      correos: this.fb.array([], [this.duplicatedEmailsValidator])
    });

    this.form_poliza.get('vin')!.valueChanges.subscribe(v => {
      const norm = String(v || '')
        .toUpperCase()
        .replace(/[^A-HJ-NPR-Z0-9]/g, '')
        .slice(0, 17);
      if (norm !== v) this.form_poliza.get('vin')!.setValue(norm, { emitEvent: false });
    });

    this.form_poliza.get('placas')!.valueChanges.subscribe(v => {
      const norm = String(v || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 7);
      if (norm !== v) this.form_poliza.get('placas')!.setValue(norm, { emitEvent: false });
    });
  }

  ngOnInit() {
    const nav = this.router.getCurrentNavigation();
    this.mostrarPresouestaPoliza();
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
  analizaForm(campo: string): boolean {
    const control = this.form_poliza.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
  siguiente() {
    if (this.form_poliza.invalid) {
      this.form_poliza.markAllAsTouched();
      console.log('heyyyy ')
      return;
    }
    this.mostrarPresouestaPoliza();

    console.log(this.datoscotizacion)
    // const rfc = this.datosUsuario?.person?.rfc;
    const rfc = this.UsuarioRespuesta.response.rfc;
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
      // preferred_beneficiary: true,
      receivers,
      start_date,
      use_crabi_checkout: true,
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
        this.islandKey++;
        const nombre = data.response?.first_name || this.form_poliza.get('nombre')?.value || 'Tu registro';
        this.generalService.alert(
          `¡Listo! La póliza de ${nombre} se creó correctamente.`,
          'Registro exitoso',
          'success'
        );
        localStorage.setItem('datosPolizaVin_Respuesta', JSON.stringify(data));
        localStorage.removeItem('datosCoche');
        localStorage.removeItem('cotizacion');
        this.mostrar_spinnet = false;
        this.mostrarPresouestaPoliza();
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
  mostrarPresouestaPoliza() {
    const cotizacionRespuestra = localStorage.getItem('datosPolizaVin_Respuesta');
    if (cotizacionRespuestra) {

      const storedPersona = localStorage.getItem('UsuarioRespuesta');
      if (storedPersona) {
        let datos = JSON.parse(storedPersona);
        this.email = datos.response.email;
      }

      this.polizaCreada = true;
      this.datosPolizaCreada = JSON.parse(cotizacionRespuestra);
      // console.log(this.datosPolizaCreada)

      const cotizacionRespuestrap = localStorage.getItem('datosPolizaVin');

      if (cotizacionRespuestrap) {
        const gr = JSON.parse(cotizacionRespuestrap);
        // console.log(gr);
      }
    } else {
      // === cotización ===
      const cotizacion = localStorage.getItem('cotizacion');
      if (cotizacion) {
        this.datoscotizacion = JSON.parse(cotizacion);
        // console.log('Cotización cargada:', this.datoscotizacion);
      } else {
        this.datoscotizacion = null;
        this.router.navigate(['/seguros']);
        // this.generalService.alert(
        //   'Debes cotizar un coche antes de continuar con tu registro.',
        //   'Atención',
        //   'warning'
        // );
      }

      // === datosCoche ===
      const storedAuto = localStorage.getItem('datosCoche');
      if (storedAuto) {
        this.datosCoche = JSON.parse(storedAuto);
        // console.log('DATOS - coche ', this.datosCoche);
      } else {
        this.datosCoche = null;
        this.router.navigate(['/seguros']);
        this.generalService.alert(
          'Debes de cotizar un aut antes de continuar.',
          'Atención',
          'warning'
        );
        return;
      }

      // === UsuarioRespuesta ===
      const storedPersonaRespuesta = localStorage.getItem('UsuarioRespuesta');
      if (storedPersonaRespuesta) {
        this.UsuarioRespuesta = JSON.parse(storedPersonaRespuesta);
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
  }
  realizarPago() {
    if (!this.datosPolizaCreada?.response?.policies?.length) {
      console.error('No hay pólizas en la respuesta');
      return;
    }

    let id: string = '';
    const targetId = "a64c55ab-03bb-4774-89e6-ad69d2362966";
    const policy = this.datosPolizaCreada.response.policies.find(
      (p: any) => p.policy_type?.id === targetId
    );

    if (policy) {
      const policyId = policy.policy_id;
      id = policyId;
      // console.log("Policy encontrada:", policyId);
    } else {
      console.warn("No se encontró la póliza con el ID buscado");
    }

    this.mostrar_spinnet = true;
    this.seguros.pagoPoliza(id).subscribe({
      next: async (data: any) => {
        try {
          const url = data?.response?.checkout_url as string;
          const policyNumber = data?.response?.policy_number as string;
          const validUntilISO = data?.response?.valid_until as string;

          // (opcional) guarda datos útiles
          if (policyNumber) localStorage.setItem('crabi_policy_number', policyNumber);
          if (validUntilISO) localStorage.setItem('crabi_valid_until', validUntilISO);

          await this.abrirPagoForzado(url);
        } catch (e) {
          console.error('Error al abrir pago:', e);
          await this.generalService.alert(
            'No se pudo abrir la URL de pago. Intenta de nuevo.',
            'Error',
            'danger'
          );
        } finally {
          this.mostrar_spinnet = false;
        }
      },
      error: async (error) => {
        this.mostrar_spinnet = false;
        console.error('Error al crear pago:', error);
        await this.generalService.alert(
          'Ocurrió un error en el método de pago. Intenta nuevamente más tarde.',
          'Error',
          'danger'
        );
      }
    });

  }
  private async abrirPagoForzado(url: string) {
    if (!url || typeof url !== 'string') {
      await this.generalService.alert('No se recibió una URL de pago válida.', 'Error', 'danger');
      return;
    }

    try {
      // Preferente: pestaña del sistema (Chrome Custom Tabs / SFSafariViewController)
      await Browser.open({ url });
    } catch (e) {
      // Fallback por si falla el plugin o estás en Web sin plugin
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        // Último recurso: misma pestaña
        window.location.href = url;
      }
    }
  }
  regresar() {
    this.generalService.confirmarAccion(
      '¿Estás seguro en cotizar un nuevo coche?',
      'Salir de proceso',
      async () => {
        localStorage.removeItem('datosPolizaVin_Respuesta');
        localStorage.removeItem('datosPolizaVin');
        this.polizaCreada = false;
        this.islandKey++;
        this.router.navigate(['/seguros']);
      }
    );
  }
  regresarPage() {
    this.islandKey++;
    this.router.navigate(['/seguros/persona']);
  }
  onVinInput(ev: Event) {
    const el = ev.target as HTMLInputElement;
    const norm = (el.value || '')
      .toUpperCase()
      .replace(/[^A-HJ-NPR-Z0-9]/g, '')
      .slice(0, 17);
    if (norm !== el.value) {
      this.form_poliza.get('vin')?.setValue(norm);
    }
  }
  onPlacasInput(ev: Event) {
    const el = ev.target as HTMLInputElement;
    const norm = (el.value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 7);
    if (norm !== el.value) {
      this.form_poliza.get('placas')?.setValue(norm);
    }
  }
  private placasMxValidator = (ctrl: AbstractControl) => {
    const raw = String(ctrl.value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ''); 
    if (!raw) return { required: true };

    const patterns = [
      /^[A-Z]{3}\d{4}$/,    
      /^[A-Z]{3}\d{3}[A-Z]$/, 
      /^[A-Z]{3}\d[A-Z]\d{2}$/ 
    ];

    const ok = raw.length === 7 && patterns.some(r => r.test(raw));
    return ok ? null : { placaFormato: true };
  };
}