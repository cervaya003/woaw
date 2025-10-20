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

import { PoliticasComponent } from '../../../components/modal/politicas/politicas.component';
import { AvisoPrivasidadComponent } from '../../../components/modal/aviso-privasidad/aviso-privasidad.component';

import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { environment } from "../../../../environments/environment";

type Policy = {
  policy_number?: string;
  policy_id?: string;
  policy_type?: { id?: string };
  start_date?: string;
  end_date?: string;
};

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

  private branchId = environment.crabi_branchId;

  public isLoggedIn: boolean = false;

  esDispositivoMovil: boolean = false;
  public tipoDispocitivo: 'computadora' | 'telefono' | 'tablet' = 'computadora';

  placasEnTramite: boolean = false;

  datosCoche: any = null;
  datosUsuario: any = null;
  datoscotizacion: any = null;
  UsuarioRespuesta: any = null;
  polizaCreada: boolean = false;
  datosPolizaCreada: any = null;
  email: any = null;

  miPlan: string = '';
  fmtMoney(v: number | null | undefined) { return v == null ? '—' : (v as number).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }); }
  selectedPaymentId: string | null = null;

  islandKey = 0;

  MostrarLogin: boolean = true;
  MostrarRegistro: boolean = false;
  MostrarRecuperacion: boolean = false;

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


  // CALENDARIO -----
  _calWeeks: Array<Array<{ date: Date | null; disabled: boolean; outside: boolean; selected: boolean; today: boolean }>> = [];
  _calViewYear = new Date().getFullYear();
  _calViewMonth = new Date().getMonth(); // 0-11
  _calMin!: Date; // mañana
  _calMax!: Date; // fin del próximo mes
  _startDateISO: string | null = localStorage.getItem('start_date_override') || null;
  _calCanPrev = false;
  _calCanNext = true;
  get _calHeader(): string {
    const d = new Date(this._calViewYear, this._calViewMonth, 1);
    return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(d);
  }
  // ------ 

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
          // this.placasMxValidator
        ]
      ],
      color: ['', Validators.required],
      correos: this.fb.array([], [this.duplicatedEmailsValidator]),
      pago: ['', Validators.required],
    });

    this.form_poliza.get('vin')!.valueChanges.subscribe(v => {
      const norm = String(v || '')
        .toUpperCase()
        .replace(/[^A-HJ-NPR-Z0-9]/g, '')
        .slice(0, 17);
      if (norm !== v) this.form_poliza.get('vin')!.setValue(norm, { emitEvent: false });
    });

    // this.form_poliza.get('placas')!.valueChanges.subscribe(v => {
    //   const norm = String(v || '')
    //     .toUpperCase()
    //     .replace(/[^A-Z0-9]/g, '')
    //     .slice(0, 7);
    //   if (norm !== v) this.form_poliza.get('placas')!.setValue(norm, { emitEvent: false });
    // });
  }
  ngOnInit() {
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.tipoDispocitivo = tipo;
    });
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });
    this.verificarAuth();
    this.mostrarPresouestaPoliza();
    this.getPosition();
    this.calInitOrChange()
  }

  async verificarAuth(): Promise<boolean> {
    return new Promise((resolve) => {
      this.generalService.tokenExistente$.subscribe((estado) => {
        this.isLoggedIn = estado;
        resolve(estado);
      });
    });
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
    const rfc = this.UsuarioRespuesta.response.rfc;
    const id = this.datoscotizacion.id;

    const pos = this.getPosition();
    const idPlanEspesifico = this.datoscotizacion.plans?.[0].payment_plans?.[pos].id;
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
        plan_id: idPlan,
        payment_plan_id: idPlanEspesifico,
      },
      // preferred_beneficiary: true,
      branch_id: this.branchId,
      receivers,
      start_date,
      use_crabi_checkout: true,
      send_mail_to_client: true,
      send_whatsapp_to_client: true
    };

    this.generalService.confirmarAccion(
      `${this.miPlan}`,
      'Crear tu póliza',
      async () => {
        localStorage.setItem('datosPolizaVin', JSON.stringify(payload));
        this.crearPoliza(payload);
      }
    );
    // console.log('Payload de la póliza:', payload);
  }
  private crearPoliza(payload: any) {
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

        let mensaje = error?.error?.error || 'Ocurrió un error al crear la póliza. Intenta nuevamente más tarde.';

        mensaje = mensaje.replace(/\(\d+\/\d+\)/g, '').trim();

        this.generalService.alert(
          mensaje,
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
      } else {
        this.datoscotizacion = null;
        this.router.navigate(['/seguros/autos']);
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
        this.router.navigate(['/seguros/autos']);
        this.generalService.alert(
          'Debes de cotizar un auto antes de continuar.',
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
    // console.log(this.datosPolizaCreada)

    if (!this.datosPolizaCreada?.response?.policies?.length) {
      console.error('No hay pólizas en la respuesta');
      return;
    }

    let id = "";
    const targetId = "a64c55ab-03bb-4774-89e6-ad69d2362966";

    const policyId = resolvePolicyId(this.datosPolizaCreada, targetId, "CO-");
    if (policyId) {
      id = policyId;
    } else {
      console.warn("No se encontró policy_id ni por policy_type.id ni por 'CO-'.");
      return;
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
        localStorage.removeItem('datosCoche');
        localStorage.removeItem('cotizacion');
        localStorage.removeItem('datosPolizaVin_Respuesta');
        localStorage.removeItem('datosPolizaVin');
        this.polizaCreada = false;
        this.islandKey++;
        this.router.navigate(['/seguros/autos']);
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
  public togglePlacasTramite() {
    const ctrl = this.form_poliza.get('placas');
    if (!ctrl) return;

    if (this.placasEnTramite) {
      ctrl.setValue('En trámite', { emitEvent: false });
      ctrl.clearValidators();
      ctrl.updateValueAndValidity({ emitEvent: false });
    } else {
      ctrl.setValue('', { emitEvent: false });
      ctrl.setValidators([Validators.required/*, tu patrón si aplica */]);
      ctrl.updateValueAndValidity({ emitEvent: false });
    }
  }
  public onPlacasInput(ev: Event) {
    if (this.placasEnTramite) return;
    const el = ev.target as HTMLInputElement;
    const norm = (el.value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 7);
    if (norm !== el.value) {
      this.form_poliza.get('placas')?.setValue(norm, { emitEvent: false });
    }
  }

  // private placasMxValidator = (ctrl: AbstractControl) => {
  //   const raw = String(ctrl.value || '')
  //     .toUpperCase()
  //     .replace(/[^A-Z0-9]/g, '');
  //   if (!raw) return { required: true };
  //   const patterns = [
  //     /^[A-Z]{3}\d{4}$/,
  //     /^[A-Z]{3}\d{3}[A-Z]$/,
  //     /^[A-Z]{3}\d[A-Z]\d{2}$/
  //   ];
  //   const ok = raw.length === 7 && patterns.some(r => r.test(raw));
  //   return ok ? null : { placaFormato: true };
  // };

  // 1) ÚNICO switch centralizado
  private formatPaymentLabel(rawName: string, count: number): string {
    const raw = (rawName ?? '').toString().toUpperCase();
    switch (raw) {
      case 'ANNUAL': return 'Pago de contado';
      case 'SUBSCRIPTION': return count > 1 ? `${count} pagos (suscripción)` : 'Suscripción';
      case 'FLAT_FEE': return count > 1 ? `${count} pagos fijos` : 'Pago fijo';
      default: return raw;
    }
  }

  private getPosition(): number {
    const posStr = localStorage.getItem('posicionSeleccionada');
    const pos = Number(posStr);

    const plan = this.datoscotizacion?.plans?.[0];
    const paymentPlan = plan?.payment_plans?.[pos];

    if (paymentPlan) {
      const label = this.formatPaymentLabel(paymentPlan.name, paymentPlan.payments?.length ?? 1);
      const total = this.fmtMoney(paymentPlan.total);
      this.miPlan = `${label} — ${total}`;

      this.selectedPaymentId = paymentPlan.id;
    }

    return pos;
  }
  paymentPlanLabel(pp: any): string {
    const raw = (pp?.name ?? '').toString().toUpperCase();
    const count = Array.isArray(pp?.payments) ? pp.payments.length : 1;
    switch (raw) {
      case 'ANNUAL': return 'Pago de contado';
      case 'SUBSCRIPTION': return count > 1 ? `${count} pagos (suscripción)` : 'Suscripción';
      case 'FLAT_FEE': return count > 1 ? `${count} pagos fijos` : 'Pago fijo';
      case 'MSI': return count > 1 ? `${count} pagos Meses sin intereses` : 'Pago fijo';
      default: return raw;
    }
  }
  onSelectPayment(paymentPlanId: string) {
    const arr = this.datoscotizacion?.plans?.[0]?.payment_plans;
    if (!arr?.length) return;

    const idx = arr.findIndex((pp: any) => pp.id === paymentPlanId);
    if (idx >= 0) {
      localStorage.setItem('posicionSeleccionada', String(idx));

      const pp = arr[idx];
      const label = this.formatPaymentLabel(pp?.name, Array.isArray(pp?.payments) ? pp.payments.length : 1);
      this.miPlan = `${label} — ${this.fmtMoney(pp?.total)}`;
    }
  }
  // === GETTERS derivados DIRECTAMENTE de datosPolizaCreada ===
  get policyCO() {
    const policies = this.datosPolizaCreada?.response?.policies || [];
    return policies.find((p: any) => typeof p?.policy_number === 'string' && p.policy_number.startsWith('CO-')) || null;
  }
  get folioCO(): string | null {
    return this.policyCO?.policy_number ?? null;
  }
  get inicioVigencia(): string | null {
    const s = this.policyCO?.start_date ? new Date(this.policyCO.start_date) : null;
    return s ? s.toLocaleDateString() : null;
  }
  get finVigencia(): string | null {
    const e = this.policyCO?.end_date ? new Date(this.policyCO.end_date) : null;
    return e ? e.toLocaleDateString() : null;
  }
  get invoiceUrl(): string | null {
    const files = this.datosPolizaCreada?.response?.files || [];
    return files.find((f: any) => f?.name === 'invoice')?.url ?? null;
  }
  get coverUrl(): string | null {
    const files = this.datosPolizaCreada?.response?.files || [];
    return files.find((f: any) => f?.name === 'cover')?.url ?? null;
  }

  // Login ------ 
  cambioEstatus(dato: string) {
    switch (dato) {
      case 'registro':
        this.MostrarLogin = false;
        this.MostrarRegistro = true;
        this.MostrarRecuperacion = false;
        break;
      case 'login':
        this.MostrarLogin = true;
        this.MostrarRegistro = false;
        this.MostrarRecuperacion = false;
        break;
      case 'reset':
        this.MostrarLogin = false;
        this.MostrarRegistro = false;
        this.MostrarRecuperacion = true;
        break;
      default:
        break;
    }
  }

  // ## ------ POLITICAS Y AVISO DE PRIVACIDAD ------ ##
  async mostrarTerminos() {
    const modal = await this.modalCtrl.create({
      component: PoliticasComponent,
      componentProps: {
        onAceptar: () => this.setAceptado('terminos', true),
        onCancelar: () => this.setAceptado('terminos', false),
      },
      backdropDismiss: true,
      showBackdrop: true,
      ...(!this.esDispositivoMovil && {
        cssClass: 'modal-consentimiento',
      }),
      ...(this.esDispositivoMovil && {
        breakpoints: [0, 0.7, 1],
        initialBreakpoint: 1,
        handle: true,
      }),
    });
    await modal.present();
  }
  async mostrarAviso() {
    const modal = await this.modalCtrl.create({
      component: AvisoPrivasidadComponent,
      componentProps: {
        onAceptar: () => this.setAceptado('aviso', true),
        onCancelar: () => this.setAceptado('aviso', false),
      },
      backdropDismiss: true,
      showBackdrop: true,
      ...(!this.esDispositivoMovil && {
        cssClass: 'modal-consentimiento',
      }),
      ...(this.esDispositivoMovil && {
        breakpoints: [0, 0.7, 1],
        initialBreakpoint: 1,
        handle: true,
      }),
    });
    await modal.present();
  }

  setAceptado(tipo: 'aviso' | 'terminos', valor: boolean) {
    if (valor === true) {
      localStorage.setItem(tipo, 'true');
    } else {
      localStorage.setItem(tipo, 'false');
      const titulos: Record<typeof tipo, string> = {
        aviso: 'Aviso de Privacidad',
        terminos: 'Términos y Condiciones',
      };

      const mensajes: Record<typeof tipo, string> = {
        aviso:
          'Por tu seguridad y protección de datos, es necesario aceptar el Aviso de Privacidad.',
        terminos:
          'Debes aceptar los Términos y Condiciones para usar este servicio de forma segura y responsable.',
      };

      this.generalService.alert(titulos[tipo], mensajes[tipo], 'info');

      localStorage.removeItem(tipo);
    }
  }

  // CALENDARIO -----
  public calInitOrChange(dir: -1 | 0 | 1 = 0) {
    const today = new Date();
    const mañana = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const finProx = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    this._calMin = new Date(mañana.getFullYear(), mañana.getMonth(), mañana.getDate());
    this._calMax = new Date(finProx.getFullYear(), finProx.getMonth(), finProx.getDate());

    if (dir !== 0) {
      const y = this._calViewYear, m = this._calViewMonth + dir;
      const nuevo = new Date(y, m, 1);
      const minYM = { y: this._calMin.getFullYear(), m: this._calMin.getMonth() };
      const maxYM = { y: this._calMax.getFullYear(), m: this._calMax.getMonth() };
      const viewYM = { y: nuevo.getFullYear(), m: nuevo.getMonth() };
      const cmpPrev = (a: any, b: any) => (a.y !== b.y ? a.y - b.y : a.m - b.m);
      if (cmpPrev(viewYM, minYM) < 0 || cmpPrev(viewYM, maxYM) > 0) {
        // fuera de rango: ignora
      } else {
        this._calViewYear = nuevo.getFullYear();
        this._calViewMonth = nuevo.getMonth();
      }
    }

    const first = new Date(this._calViewYear, this._calViewMonth, 1);
    const startWeekday = ((first.getDay() + 6) % 7); // L=0..D=6
    const daysInMonth = new Date(this._calViewYear, this._calViewMonth + 1, 0).getDate();
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

    const weeks: typeof this._calWeeks = [];
    const cells: any[] = [];
    const at0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const inRange = (d: Date) => at0(d).getTime() >= at0(this._calMin).getTime() && at0(d).getTime() <= at0(this._calMax).getTime();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startWeekday + 1;
      const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
      const date = inMonth ? new Date(this._calViewYear, this._calViewMonth, dayNum) : null;
      const cell = {
        date,
        outside: !inMonth,
        disabled: true,
        selected: false,
        today: false
      };
      if (date) {
        const sel = this._startDateISO && iso(date) === this._startDateISO;
        cell.today = at0(date).getTime() === at0(today).getTime();
        cell.disabled = !inRange(date);
        cell.selected = !!sel;
      }
      cells.push(cell);
    }
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    this._calWeeks = weeks;

    const minYM = { y: this._calMin.getFullYear(), m: this._calMin.getMonth() };
    const maxYM = { y: this._calMax.getFullYear(), m: this._calMax.getMonth() };
    const viewYM = { y: this._calViewYear, m: this._calViewMonth };
    const cmp = (a: any, b: any) => (a.y !== b.y ? a.y - b.y : a.m - b.m);
    this._calCanPrev = cmp(viewYM, minYM) > 0;
    this._calCanNext = cmp(viewYM, maxYM) < 0;
  }
  public _calPick(d: Date | null) {
    if (!d) return;
    const at0 = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    const inRange = (x: Date) => at0(x).getTime() >= at0(this._calMin).getTime() && at0(x).getTime() <= at0(this._calMax).getTime();
    if (!inRange(d)) return;

    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this._startDateISO = iso;
    localStorage.setItem('start_date_override', iso);

    for (const wk of this._calWeeks) {
      for (const c of wk) {
        if (!c.date) { c.selected = false; continue; }
        const ci = `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, '0')}-${String(c.date.getDate()).padStart(2, '0')}`;
        c.selected = ci === iso;
      }
    }
  }

}

function resolvePolicyId(
  payload: any,
  targetTypeId: string,
  coPrefix = "CO-"
): string | null {
  const policies: Policy[] = payload?.response?.policies ?? [];
  if (!Array.isArray(policies) || policies.length === 0) return null;

  const byType = policies.find(p => p?.policy_type?.id === targetTypeId);
  if (byType?.policy_id) return byType.policy_id;

  const coPolicies = policies.filter(
    p => typeof p.policy_number === "string" && p.policy_number.startsWith(coPrefix)
  );
  if (coPolicies.length === 0) return null;

  coPolicies.sort((a, b) => {
    const ta = new Date(a.start_date ?? 0).getTime();
    const tb = new Date(b.start_date ?? 0).getTime();
    return tb - ta;
  });

  return coPolicies[0]?.policy_id ?? null;
}