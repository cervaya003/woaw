import { Component, OnInit } from '@angular/core';
import { PopoverController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CarsService } from '../../../services/cars.service';
import { GeneralService } from '../../../services/general.service';
import { SeguroService } from '../../../services/seguro.service';


import { AfterViewInit, ElementRef, QueryList, ViewChildren, ViewChild } from '@angular/core';

@Component({
  selector: 'app-seguros',
  templateUrl: './seguros.page.html',
  styleUrls: ['./seguros.page.scss'],
  standalone: false
})
export class SegurosPage implements OnInit {
  overlayLoaded = false;
  usuario: any;
  public isLoggedIn = false;
  pedir_datos: boolean = false;
  activePlan: any = null;
  quote: any | null = null;
  cotizacion = false;
  selectedPaymentByPlan: Record<string, string> = {};
  imgenPrincipal = '';
  form: FormGroup;
  // Pasos: 1=marca, 2=modelo, 3=año, 4=versión, 5=nacimiento, 6=cp/género/estado
  currentStep = 1;
  islandKey = 0;

  // --- propiedades auxiliares ---
  marcas: Array<{ id: number; name: string }> = [];
  opciones: Array<{ key: string; nombre: string; imageUrl: string | null }> = [];
  searchTerm = '';
  filteredBrandsVM: Array<{ id: number; name: string; imageUrl: string | null }> = [];
  brandsVM: Array<{ id: number; name: string; imageUrl: string | null }> = [];
  brandsVMFull: Array<{ id: number; name: string; imageUrl: string | null }> = [];

  // Catálogos previos
  modelos: { id: number; name: string }[] = [];
  anios: number[] = [];
  versions: { id: number; parts: string }[] = [];

  steps = [
    'Marca',
    'Vehículo',
    'Edad',
    'Datos',
    'Cotizar'
  ];

  mostrar_spinnet: boolean = false;
  selectedPlanIndexes = new Set<number>();
  // Selecciones previas
  selectedMarcaId: number | null = null;
  selectedModeloId: number | null = null;
  selectedAnioId: number | null = null;

  // Paso 6
  generoOpts = [
    { value: 'hombre', label: 'Hombre' },
    { value: 'mujer', label: 'Mujer' },
  ];
  estadoCivilOpts = [
    { value: 'soltero', label: 'Soltero(a)' },
    { value: 'casado', label: 'Casado(a)' },
    { value: 'divorciado', label: 'Divorciado(a)' },
  ];
  duracionOpts: number[] = [12, 24, 36, 48, 60];

  public tipoDispocitivo: 'computadora' | 'telefono' | 'tablet' = 'computadora';

  // Paso 5: fecha de nacimiento
  dias: number[] = Array.from({ length: 31 }, (_, i) => i + 1);
  meses = [
    { v: 1, l: 'Enero' }, { v: 2, l: 'Febrero' }, { v: 3, l: 'Marzo' },
    { v: 4, l: 'Abril' }, { v: 5, l: 'Mayo' }, { v: 6, l: 'Junio' },
    { v: 7, l: 'Julio' }, { v: 8, l: 'Agosto' }, { v: 9, l: 'Septiembre' },
    { v: 10, l: 'Octubre' }, { v: 11, l: 'Noviembre' }, { v: 12, l: 'Diciembre' },
  ];
  aniosNacimiento: number[] = [];

  fmtMoney(v: number | null | undefined) { return v == null ? '—' : (v as number).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }); }
  fmtPct(v: number | null | undefined) { return v == null ? null : (v as number); }
  fmtDate(iso: string) { return new Date(iso); }

  mapCoverage(code: string) {
    const m: Record<string, string> = {
      RCP: 'Resp. Civil a Personas',
      RCB: 'Resp. Civil a Bienes',
      RCPO: 'Resp. Civil a Personas (Oblig.)',
      RCBO: 'Resp. Civil a Bienes (Oblig.)',
      GM: 'Gastos Médicos',
      DM: 'Daños Materiales',
      AL: 'Asistencia Legal',
      AV: 'Asistencia Vial',
      RT: 'Robo Total'
    };
    return m[code] ?? code;
  }

  ultimaCotizacion: any = null;

  constructor(
    private popoverCtrl: PopoverController,
    private alertCtrl: AlertController,
    private router: Router,
    private generalService: GeneralService,
    public carsService: CarsService,
    private fb: FormBuilder,
    private seguros: SeguroService
  ) {
    this.form = this.fb.group({
      marca: [null, Validators.required],
    });
  }

  ngOnInit() {
    this.islandKey++;
    this.verificaStorage();
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.tipoDispocitivo = tipo;
    });
    this.buildAniosNacimiento();
    this.cargaimagen();
    this.cargarUltimaCotizacion();
  }
  ionViewWillEnter() {
    this.islandKey++;
  }
  private verificaStorage() {
    const raw = localStorage.getItem('cotizacion');
    if (!raw) {
      this.getMarcas_cohes();
      this.obtenerMarcas();
      return;
    }

    this.currentStep = 7;
    this.quote = JSON.parse(raw);
    this.cotizacion = !!this.quote;

    if (this.quote?.plans?.length) {
      this.selectedPaymentByPlan = {};

      this.quote.plans.forEach((pl: any) => {
        const firstId = pl?.payment_plans?.[0]?.id ?? null;
        if (firstId) this.selectedPaymentByPlan[pl.id] = firstId;
      });

      this.activePlan = this.quote.plans[0] ?? null;

      if (this.activePlan) this.onSelectPayment(this.activePlan.id);
    } else {
      this.activePlan = null;
    }
  }
  async cargaimagen() {
    this.imgenPrincipal = '/assets/autos/seguro.webp';
    this.generalService.addPreload(this.imgenPrincipal, 'image');
    try {
      await Promise.all([
        this.generalService.preloadHero(this.imgenPrincipal, 4500),
      ]);
    } finally {
    }
  }
  private buildAniosNacimiento() {
    const hoy = new Date();
    const maxYear = hoy.getFullYear() - 18;
    const minYear = maxYear - 72;
    this.aniosNacimiento = [];
    for (let y = maxYear; y >= minYear; y--) this.aniosNacimiento.push(y);
  }

  // ---------- Validadores ----------
  private fechaNacimientoValida = (): ((ctrl: AbstractControl) => ValidationErrors | null) => {
    return (ctrl: AbstractControl): ValidationErrors | null => {
      const d = Number(ctrl.get('nacDia')?.value);
      const m = Number(ctrl.get('nacMes')?.value);
      const y = Number(ctrl.get('nacAnio')?.value);
      if (!d || !m || !y) return { required: true };

      const fecha = new Date(y, m - 1, d);
      const esReal = fecha.getFullYear() === y && (fecha.getMonth() + 1) === m && fecha.getDate() === d;
      if (!esReal) return { fechaInvalida: true };

      const hoy = new Date();
      const f18 = new Date(y + 18, m - 1, d);
      if (f18 > hoy) return { menorDeEdad: true };

      return null;
    };
  };

  // ---------- Data ----------
  private obtenerMarcas(): void {
    this.seguros.getMarcas().subscribe({
      next: (data) => {
        this.marcas = data?.response?.brands ?? [];
        this.buildVM();
        // console.log(this.marcas)
      },
      error: (error) => console.error('Error al obtener marcas:', error),
    });
  }
  private obtenerModelos(marcaId: number) {
    this.seguros.getModelos(marcaId).subscribe({
      next: (data) => {
        this.modelos = data?.response?.types ?? [];
      },
      error: (error) => console.error('Error al obtener modelos:', error),
    });
  }
  private obtenerAnios(marcaId: number, modeloId: number) {
    this.seguros.getAnios(marcaId, modeloId).subscribe({
      next: (data) => {
        const lista = data?.response?.models ?? [];
        this.anios = lista
          .map((m: any) => Number(m.model))
          .filter((y: number) => Number.isFinite(y))
          .sort((a: number, b: number) => b - a);
      },
      error: (error) => console.error('Error al obtener modelos:', error),
    });
  }
  private obtenerVersion(marcaId: number, modeloId: number, anioId: number) {
    this.seguros.getVersion(marcaId, modeloId, anioId).subscribe({
      next: (data) => {
        const lista = data?.response?.versions ?? [];
        this.versions = lista.map((v: any) => ({
          id: Number(v.id),
          parts: String(v.parts ?? ''),
        }));
      },
      error: (error) => console.error('Error al obtener modelos:', error),
    });
  }

  // ---------- Helpers para crear controles por paso ----------

  private ensurePaso3() {
    if (!this.form.get('nacDia')) {
      this.form.addControl('nacDia', this.fb.control(null, Validators.required));
    }
    if (!this.form.get('nacMes')) {
      this.form.addControl('nacMes', this.fb.control(null, Validators.required));
    }
    if (!this.form.get('nacAnio')) {
      this.form.addControl('nacAnio', this.fb.control(null, Validators.required));
    }
    this.form.setValidators(this.fechaNacimientoValida());
    this.form.updateValueAndValidity({ emitEvent: false });
  }
  private ensurePaso4() {
    if (!this.form.get('cp')) {
      this.form.addControl('cp', this.fb.control(null, [
        Validators.required,
        Validators.pattern(/^\d{5}$/),
      ]));
    }
    if (!this.form.get('genero')) {
      this.form.addControl('genero', this.fb.control(null, Validators.required));
    }
    if (!this.form.get('estadoCivil')) {
      this.form.addControl('estadoCivil', this.fb.control(null, Validators.required));
    }
    // if (!this.form.get('duracion')) {
    //   this.form.addControl('duracion', this.fb.control(null, Validators.required));
    // }
  }

  // ---------- Flow ----------
  // submit del form 
  siguiente() {
    // 1 -> 2
    if (this.currentStep === 1) {
      if (this.form.get('marca')?.invalid) return;
      this.selectedMarcaId = Number(this.form.get('marca')?.value);
      // console.log(this.selectedMarcaId)
      this.obtenerModelos(this.selectedMarcaId);
      if (!this.form.get('modelo')) {
        this.form.addControl('modelo', this.fb.control(null, Validators.required));
      }
      if (!this.form.get('anio')) {
        this.form.addControl('anio', this.fb.control(null, Validators.required));
      }
      if (!this.form.get('version')) {
        this.form.addControl('version', this.fb.control(null, Validators.required));
      }


      this.form.get('anio')?.disable({ emitEvent: false });
      this.form.get('version')?.disable({ emitEvent: false });

      this.currentStep = 2;
      return;
    }

    // 2 
    if (this.currentStep === 2) {
      if (this.form.get('version')?.invalid && this.form.get('anio')?.invalid && this.form.get('version')?.invalid) return;
      this.ensurePaso3();
      this.currentStep = 3;
      return;
    }


    // 3
    if (this.currentStep === 3) {
      if (this.form.errors) return;
      this.ensurePaso4();
      this.currentStep = 4;
      return;
    }

    // 4
    if (this.currentStep === 4) {
      if (
        this.form.get('cp')?.invalid ||
        this.form.get('genero')?.invalid ||
        this.form.get('estadoCivil')?.invalid
      ) return;

      this.currentStep = 5;
      return;

    }

    // 5 -> finalizar (cotizar)
    if (this.currentStep === 5) {
      const payload = {
        marcaId: Number(this.form.get('marca')?.value),
        modeloId: Number(this.form.get('modelo')?.value),
        anio: Number(this.form.get('anio')?.value),
        versionId: Number(this.form.get('version')?.value),
        nacimiento: {
          dia: Number(this.form.get('nacDia')?.value),
          mes: Number(this.form.get('nacMes')?.value),
          anio: Number(this.form.get('nacAnio')?.value),
        },
        cp: String(this.form.get('cp')?.value),
        genero: String(this.form.get('genero')?.value),
        estadoCivil: String(this.form.get('estadoCivil')?.value),
        // duracionMeses: Number(this.form.get('duracion')?.value),
      };
      this.HacerCotizacion(this.buildCotizacionDTO(payload));
      return;
    }

  }
  ClearRegrasar() {
    switch (this.currentStep) {
      case (1):
        this.form.get('marca')?.reset(null);
        ['modelo', 'anio', 'version', 'nacDia', 'nacMes', 'nacAnio', 'cp', 'genero', 'estadoCivil', 'nombre', 'email']
          .forEach(k => { if (this.form.get(k)) this.form.removeControl(k); });

        this.selectedMarcaId = null;
        this.selectedModeloId = null;
        this.selectedAnioId = null;

        this.currentStep = 1;
        this.form.setErrors(null);
        break;
      case (2):
        ['modelo', 'anio', 'version'].forEach(k => { if (this.form.get(k)) this.form.removeControl(k); });
        this.currentStep = 1;
        this.modelos = [];
        this.anios = [];
        this.versions = [];
        this.form.setErrors(null);
        break;
      case (3):
        ['nacDia', 'nacMes', 'nacAnio'].forEach(k => { if (this.form.get(k)) this.form.removeControl(k); });
        this.currentStep = 2;
        this.form.setErrors(null);
        break;
      case (4):
        ['cp', 'genero', 'estadoCivil'].forEach(k => { if (this.form.get(k)) this.form.removeControl(k); });
        this.currentStep = 3;
        this.form.setErrors(null);
        break;
      case (5):
        this.currentStep = 4;
        break;
      default:
        break;
    }
  }
  getMarcaLabel(): string {
    const id = Number(this.form.get('marca')?.value);
    return this.marcas.find(m => m.id === id)?.name ?? '-';
  }
  getModeloLabel(): string {
    const id = Number(this.form.get('modelo')?.value);
    return this.modelos.find(m => m.id === id)?.name ?? '-';
  }
  getVersionLabel(): string {
    const id = Number(this.form.get('version')?.value);
    return this.versions.find(v => v.id === id)?.parts ?? '-';
  }
  getGeneroLabel(): string {
    const v = this.form.get('genero')?.value;
    return this.generoOpts.find(g => g.value === v)?.label ?? '-';
  }
  getEstadoCivilLabel(): string {
    const v = this.form.get('estadoCivil')?.value;
    return this.estadoCivilOpts.find(e => e.value === v)?.label ?? '-';
  }
  getNacimiento(): string {
    const d = this.form.get('nacDia')?.value;
    const m = this.form.get('nacMes')?.value;
    const y = this.form.get('nacAnio')?.value;
    const pad = (n: number) => String(n).padStart(2, '0');
    return d && m && y ? `${pad(Number(d))}/${pad(Number(m))}/${y}` : '-';
  }

  // ---------- Progreso ----------
  progress(): number {
    const total = this.steps.length;        // 7
    const idx = Math.max(1, Math.min(this.currentStep, total)) - 1; // 0..6
    const pct = (idx / (total - 1)) * 100;                          // 0..100
    // redondeo a 2 decimales para evitar gaps por subpíxeles
    return Math.round(pct * 100) / 100;
  }
  buildCotizacionDTO(payload: {
    marcaId: number;
    modeloId: number;
    anio: number;
    versionId: number;
    nacimiento: { dia: number; mes: number; anio: number; };
    cp: string;
    genero: string;
    estadoCivil: string;
  }) {
    const pad2 = (n: number) => String(n).padStart(2, '0');

    const genderMap: Record<string, number> = { hombre: 1, mujer: 2 };
    const civilMap: Record<string, number> = { soltero: 1, casado: 2, divorciado: 4 };

    const gender_code = genderMap[(payload.genero || '').toLowerCase()] ?? null;
    const civil_status_code = civilMap[(payload.estadoCivil || '').toLowerCase()] ?? null;

    const birthdate = `${payload.nacimiento.anio}-${pad2(payload.nacimiento.mes)}-${pad2(payload.nacimiento.dia)}`;

    const dto = {
      vehicle: {
        version: { code: Number(payload.versionId) }
      },
      region: {
        postal_code: String(payload.cp)
      },
      person: {
        gender_code,
        birthdate,
        civil_status_code
      },
      duration: 12
    };

    const datosCoche = {
      marca: this.getMarcaLabel(),
      marcaId: payload.marcaId,
      modelo: this.getModeloLabel(),
      modeloId: payload.modeloId,
      version: this.getVersionLabel(),
      versionId: payload.versionId,
      anio: payload.anio,
      cp: payload.cp,
      genero: payload.genero,
      estadoCivil: payload.estadoCivil,
      nacimiento: payload.nacimiento,
      gender_code,
      civil_status_code,
      birthdate
    };
    localStorage.setItem('datosCoche', JSON.stringify(datosCoche));
    return dto;
  }
  nuevoSeguro() {
    this.generalService.confirmarAccion(
      '¿Estás seguro en cotizar un nuevo coche?',
      'Cotizar nuevo coche',
      async () => {
        this.islandKey++;
        this.guardarHistorialCotizacion();
        this.getMarcas_cohes();
        this.obtenerMarcas();

        this.cotizacion = false;
        this.quote = null;
        this.selectedPaymentByPlan = {};

        this.currentStep = 1;
        this.activePlan = null;
        // limpia selects/datos auxiliares
        this.selectedMarcaId = null;
        this.selectedModeloId = null;
        this.selectedAnioId = null;
        this.modelos = [];
        this.anios = [];
        this.versions = [];

        const keep = ['marca'];
        Object.keys(this.form.controls).forEach(k => {
          if (!keep.includes(k)) this.form.removeControl(k);
        });
        this.form.reset();
        this.form.get('marca')?.setValue(null, { emitEvent: false });
        this.form.setErrors(null);

        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { }

        window.location.reload();
      }
    );
  }
  guardarHistorialCotizacion() {
    const datosCoche = localStorage.getItem('datosCoche');
    const cotizacion = localStorage.getItem('cotizacion');

    // === Guarda por separado ===
    if (datosCoche) {
      localStorage.setItem('historialDatosCoche', datosCoche);
    }

    if (cotizacion) {
      localStorage.setItem('historialCotizacion', cotizacion);
    }

    // === Limpieza de los actuales ===
    localStorage.removeItem('datosCoche');
    localStorage.removeItem('cotizacion');
    localStorage.removeItem('datosPolizaVin_Respuesta');
    localStorage.removeItem('datosPolizaVin');
  }
  cargarUltimaCotizacion() {
    try {
      const datosCocheRaw = localStorage.getItem('historialDatosCoche');
      const cotizacionRaw = localStorage.getItem('historialCotizacion');

      const datosCoche = datosCocheRaw ? JSON.parse(datosCocheRaw) : null;
      const cotizacion = cotizacionRaw ? JSON.parse(cotizacionRaw) : null;

      if (!datosCoche && !cotizacion) {
        this.ultimaCotizacion = null;
        return;
      }

      this.ultimaCotizacion = {
        fecha: new Date().toISOString(),
        datosCoche,
        cotizacion,
      };

    } catch (error) {
      console.error('❌ Error al cargar la última cotización:', error);
      this.ultimaCotizacion = null;
    }
  }
  private swapKey(currentKey: string, historyKey: string) {
    const curr = localStorage.getItem(currentKey);
    const hist = localStorage.getItem(historyKey);

    // Si no hay nada en ninguna, no hacemos nada
    if (curr === null && hist === null) return;

    // Pasa el historial a actual (si existe) o limpia actual
    if (hist !== null) localStorage.setItem(currentKey, hist);
    else localStorage.removeItem(currentKey);

    // Pasa el actual previo a historial (si existía) o limpia historial
    if (curr !== null) localStorage.setItem(historyKey, curr);
    else localStorage.removeItem(historyKey);
  }
  public restaurarOIntercambiarCotizacion() {
    this.swapKey('datosCoche', 'historialDatosCoche');
    this.swapKey('cotizacion', 'historialCotizacion');
    this.cargarUltimaCotizacion();

    console.log('🔁 Intercambio realizado entre actual ↔ historial.');
    window.location.reload();
  }

  // ---------- COTIZACION ----------
  private HacerCotizacion(data: any) {
    this.mostrar_spinnet = true;
    this.seguros.CotizacionEstimada(data).subscribe({
      next: (resp) => {
        setTimeout(() => {
          this.mostrar_spinnet = false;
          this.quote = resp.response;
          this.cotizacion = !!this.quote;

          localStorage.removeItem('cotizacion');
          if (this.quote) {
            localStorage.setItem('cotizacion', JSON.stringify(this.quote));
            this.islandKey++;
          }

          if (this.quote.plans.length) {
            this.selectedPaymentByPlan = {};
            this.quote.plans.forEach((pl: any) => {
              const firstId = pl?.payment_plans?.[0]?.id ?? null;
              if (firstId) this.selectedPaymentByPlan[pl.id] = firstId;
            });

            this.activePlan = this.quote.plans[0] ?? null;

            if (this.activePlan) this.onSelectPayment(this.activePlan.id);
          } else {
            this.activePlan = null;
          }

        }, 2500);
      },
      error: (err) => {
        this.mostrar_spinnet = false;
        console.error('Error al cotizar:', err)
      }
    });
  }
  public onSelectPayment(planId: string) {
    if (!this.quote?.plans?.length) return;

    const plan = this.quote.plans.find((pl: any) => pl.id === planId);
    if (!plan || !Array.isArray(plan.payment_plans) || !plan.payment_plans.length) return;

    const chosenId = this.selectedPaymentByPlan?.[planId] ?? plan.payment_plans[0].id;

    const idx = plan.payment_plans.findIndex((pp: any) => pp.id === chosenId);
    if (idx === -1) return;

    this.selectedPaymentByPlan[planId] = chosenId;
    localStorage.setItem('posicionSeleccionada', String(idx));
    // console.log(`[${idx}] payment_plan.id =`, chosenId);
  }
  getSelectedPayment(pl: any) {
    const id = this.selectedPaymentByPlan[pl.id];
    return pl?.payment_plans?.find((pp: any) => pp.id === id) ?? pl?.payment_plans?.[0];
  }
  paymentLabel(pp: any): string {
    const name = (pp?.name ?? '').toString();
    const count = Array.isArray(pp?.payments) ? pp.payments.length : 1;

    if (name === 'ANNUAL') return `Pago de contado (${this.fmtMoney(pp.total)})`;
    if (name === 'SUBSCRIPTION') return `${count} pagos (${this.fmtMoney(pp?.payments?.[0]?.total)} c/u)`;
    if (name === 'FLAT_FEE') return `${count} pagos fijos (${this.fmtMoney(pp?.payments?.[0]?.total)} c/u)`;
    return `${name} (${this.fmtMoney(pp.total)})`;
  }
  trackByPayment = (_: number, opt: any) => opt?.id;
  paymentSummary(pp: any) {
    const payments = Array.isArray(pp?.payments) ? pp.payments : [];
    const count = payments.length || 1;
    const total = Number(pp?.total ?? 0);

    const isOneShot = (pp?.name === 'ANNUAL') || count === 1;
    if (isOneShot) {
      const per = payments[0]?.total ?? pp?.total ?? 0;
      return { isOneShot: true, count: 1, per, total, variable: false, first: per, rest: 0, restCount: 0 };
    }

    const first = Number(payments[0]?.total ?? 0);
    const restTotals = payments.slice(1).map((p: any) => Number(p?.total ?? 0));
    const allRestEqual = restTotals.every((t: any) => t === restTotals[0]);
    const rest = allRestEqual ? (restTotals[0] ?? 0) : null;

    const variable = allRestEqual ? (first !== rest) : true;

    const restDisplay = allRestEqual ? rest : Math.min(...restTotals);

    return {
      isOneShot: false,
      count,
      per: restDisplay,
      total,
      variable,
      first,
      rest: restDisplay,
      restCount: Math.max(count - 1, 0),
    };
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
  planInfo(pp: any) {
    const payments = Array.isArray(pp?.payments) ? pp.payments : [];
    const count = payments.length || 1;

    const subtotal = Number(pp?.subtotal ?? 0);
    const taxes = Number(pp?.taxes ?? 0);
    const total = Number(pp?.total ?? 0);
    const fee = Number(pp?.fee ?? 0);
    const expedition_rights = Number(pp?.expedition_rights ?? 0);
    const net_premium = Number(pp?.net_premium ?? 0);

    let firstTotal = payments[0]?.total ?? total;
    let restTotal: number | null = null;
    let variable = false;

    if (count > 1) {
      const rest = payments.slice(1).map((p: any) => Number(p?.total ?? 0));
      const allRestEqual = rest.every((t: any) => t === rest[0]);
      variable = allRestEqual ? (Number(firstTotal) !== rest[0]) : true;
      restTotal = allRestEqual ? rest[0] : Math.min(...rest);
    }

    return {
      planLabel: this.paymentPlanLabel(pp),
      count,
      net_premium,
      subtotal, taxes, total, fee, expedition_rights,
      variable,
      firstTotal: Number(firstTotal),
      restTotal
    };
  }

  // ----- CREAR PERSONA -----
  async confirmarCrearPersona() {
    await this.CrearPersona();
  }
  async CrearPersona() {
    const stored = localStorage.getItem('datosCoche');
    if (!stored) {
      this.generalService.alert(
        'No se encontraron datos en el sistema. Vuelve a cotizar antes de crear tu póliza.',
        'Datos faltantes',
        'warning'
      );
      return;
    }

    const datos = JSON.parse(stored);
    const payload = {
      marca: datos.marca,
      modelo: datos.modelo,
      anio: datos.anio,
      version: datos.version,
      nacimiento: datos.nacimiento,
      cp: datos.cp,
      genero: datos.genero,
      estadoCivil: datos.estadoCivil
    };

    const camposFaltantes = Object.entries(payload)
      .filter(([_, v]) => !v)
      .map(([k]) => k);

    if (camposFaltantes.length > 0) {
      this.generalService.alert(
        `Faltan datos por completar: ${camposFaltantes.join(', ')}`,
        'Datos incompletos',
        'warning'
      );
      return;
    }
    this.islandKey++;
    this.router.navigate(['/seguros/persona']);
  }
  private normalizeCoverage(cov: any) {
    const code = String(cov?.coverage_type?.name ?? '').toUpperCase();
    const label = this.mapCoverage(code);

    // Monto asegurado: puede venir como amount numérico o como texto (p.ej. "Valor comercial")
    let amountText: string | null = null;
    const sa = cov?.sum_assured ?? {};
    if (typeof sa.amount === 'number') amountText = this.fmtMoney(sa.amount);
    else if (typeof sa.vehicle_value === 'string') amountText = sa.vehicle_value;

    const deductible = (typeof cov?.deductible === 'number') ? cov.deductible : null; // ej. 0.05 = 5%
    const premium = (typeof cov?.premium === 'number') ? cov.premium : null;

    return { code, label, amountText, deductible, premium };
  }
  getPlanCoverages(plan: any) {
    const out: Record<string, any> = {};
    const policies = Array.isArray(plan?.policies) ? plan.policies : [];

    for (const pol of policies) {
      const covs = Array.isArray(pol?.coverages) ? pol.coverages : [];
      for (const c of covs) {
        const item = this.normalizeCoverage(c);
        if (!item.code) continue;
        // Si ya existe esa cobertura, conserva la primera o agrega lógica de “mejor dato”
        if (!out[item.code]) out[item.code] = item;
      }
    }
    return Object.values(out);
  }
  trackByCov = (_: number, c: any) => c?.code || _;
  @ViewChildren('lista', { read: ElementRef })
  allSelects!: QueryList<ElementRef<HTMLElement>>;
  ngAfterViewInit() {
    const syncAll = () => this.syncPopoverWidths();
    syncAll();
    window.addEventListener('resize', syncAll);
  }
  syncPopoverWidths() {
    this.allSelects.forEach(ref => {
      const el = ref.nativeElement;
      const w = el.getBoundingClientRect().width;

      document.documentElement.style.setProperty('--pop-width', `${w}px`);
    });
  }
  getMarcas_cohes(): void {
    this.carsService.getMarcas_all().subscribe({
      next: (res: any[]) => {
        const fromAPI = (res || []).map(m => ({
          key: (m?.key || '').toLowerCase(),
          nombre: m?.nombre || '',
          imageUrl: m?.imageUrl ?? null
        }));

        this.opciones = this.concatMarcasManuales(fromAPI);

        this.buildVM();
      },
      error: (err) => console.error('Error al obtener marcas:', err),
    });
  }
  private buildVM(): void {
    if (!this.marcas?.length && !this.opciones?.length) {
      this.brandsVM = [];
      this.brandsVMFull = [];
      return;
    }

    const byKey = new Map<string, { imageUrl: string | null; nombre: string }>();
    for (const o of (this.opciones || [])) {
      const raw = (o?.key || o?.nombre || '');
      const k = this.aliasKey(this.normalizeKey(raw));
      if (k) byKey.set(k, { imageUrl: o.imageUrl ?? null, nombre: o.nombre || raw });
    }

    const apiVM = (this.marcas || []).map(m => {
      const name = (m?.name || '').trim();
      const norm = this.aliasKey(this.normalizeKey(name));
      const hit = byKey.get(norm) || null;
      return { id: m.id, name, imageUrl: hit?.imageUrl ?? null };
    });

    const apiKeys = new Set(
      (this.marcas || []).map(m => this.aliasKey(this.normalizeKey(m?.name || '')))
    );

    const manualOnly = (this.opciones || [])
      .map(o => {
        const raw = (o?.key || o?.nombre || '');
        const k = this.aliasKey(this.normalizeKey(raw));
        return { k, nombre: o?.nombre || raw, imageUrl: o?.imageUrl ?? null };
      })
      .filter(o => o.k && !apiKeys.has(o.k))
      .map((o, idx) => ({
        id: -1 - idx,
        name: o.nombre,
        imageUrl: o.imageUrl
      }));

    this.brandsVMFull = [...apiVM, ...manualOnly];
    this.brandsVM = [...this.brandsVMFull];
  }
  private normalizeKey(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }
  private aliasKey(norm: string): string {
    const map: Record<string, string> = {
      gac_motor: 'gac',
      jinpeng: 'jingpeng',
      mastretta: 'mastretta',
      citroen: 'citroen',
      cupra: 'cupra',
      omoda: 'omoda',
      dfsk: 'dfsk',
      sev: 'sev',
      skywell: 'skywell',
      smart: 'smart',
      seres: 'seres',
      soueast: 'soueast',
      zeekr: 'zeekr',
    };
    return map[norm] ?? norm;
  }

  // BUSCADOR -----
  isSelected(id: number): boolean {
    return this.form.get('marca')?.value === id;
  }
  selectBrand(id: number): void {
    this.form.get('marca')?.setValue(id);
  }
  onSearchBrand(query: string | null | undefined): void {
    const term = (query || '').trim().toLowerCase();
    this.brandsVM = !term
      ? [...this.brandsVMFull]
      : this.brandsVMFull.filter(b => b.name.toLowerCase().includes(term));
  }
  private concatMarcasManuales(fromAPI: Array<{ key: string; nombre?: string; imageUrl?: string | null }>): any[] {
    const manuales = [
      { key: 'arra', nombre: 'Arra', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/arra.png' },
      { key: 'aston_martin', nombre: 'Aston Martin', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/aston_martin.png' },
      { key: 'bentley', nombre: 'Bentley', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/bentley.webp' },
      { key: 'citroen', nombre: 'Citroën', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/citroen.png' },
      { key: 'dongfeng', nombre: 'Dongfeng', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/dongfeng.png' },
      { key: 'exeed', nombre: 'Exeed', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/exeed.png' },
      { key: 'ferrari', nombre: 'Ferrari', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/ferrari.png' },
      { key: 'gac', nombre: 'GAC', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/gac.png' },
      { key: 'gwm', nombre: 'GWM', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/gwm.png' },
      { key: 'hummer', nombre: 'Hummer', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/hummer.jpg' },
      { key: 'jaecoo', nombre: 'Jaecoo', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/jaecoo.png' },
      { key: 'jim', nombre: 'Jim', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/jim.jpg' },
      { key: 'jingpeng', nombre: 'Jinpeng', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/jingpeng.png' }, // tu archivo es jingpeng.png
      { key: 'kiri', nombre: 'Kiri', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/kiri.jpg' },
      { key: 'lamborghini', nombre: 'Lamborghini', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/lamborghini.png' },
      { key: 'lotus', nombre: 'Lotus', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/lotus.jpg' },
      { key: 'maserati', nombre: 'Maserati', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/maserati.png' },
      { key: 'mastretta', nombre: 'Mastretta', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/mastretta.png' }, // ← corregido
      { key: 'pontiac', nombre: 'Pontiac', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/pontiac.png' },
      { key: 'rover', nombre: 'Rover', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/rover.png' },
      { key: 'saab', nombre: 'Saab', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/saab.png' },
      { key: 'seres', nombre: 'Seres', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/seres.jpg' },
      { key: 'soueast', nombre: 'Soueast', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/soueast.png' },
      { key: 'zacua', nombre: 'Zacua', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/zacua.png' },
      { key: 'zeekr', nombre: 'Zeekr', imageUrl: 'https://storage.googleapis.com/wo-aw/marcas/zeekr.png' }
    ];

    const index = new Map<string, { key: string; nombre: string; imageUrl: string | null }>();

    for (const a of fromAPI || []) {
      const raw = a?.key || a?.nombre || '';
      const k = this.aliasKey(this.normalizeKey(raw));
      if (!k) continue;
      index.set(k, {
        key: k,
        nombre: a?.nombre || raw,
        imageUrl: a?.imageUrl ?? null
      });
    }

    // 2) Merge manuales (PREFERIR manual si trae imageUrl NO nula)
    for (const m of manuales) {
      const raw = m?.key || m?.nombre || '';
      const k = this.aliasKey(this.normalizeKey(raw));
      if (!k) continue;

      const prev = index.get(k);
      if (!prev) {
        index.set(k, { key: k, nombre: m.nombre || raw, imageUrl: m.imageUrl ?? null });
        continue;
      }

      const hasPrevLogo = !!prev.imageUrl;
      const hasManualLogo = !!m.imageUrl;

      if (!hasPrevLogo && hasManualLogo) {
        index.set(k, { key: k, nombre: m.nombre || prev.nombre, imageUrl: m.imageUrl! });
      }
    }

    return Array.from(index.values());
  }
  selectOtherBrand(): void {
    this.router.navigateByUrl('/seguros/cotizar-manual');
  }





  public onModeloSeleccionado(event: any) {
    const modeloId: number = event.detail.value;
    if (modeloId) {
      this.selectedModeloId = modeloId;
      this.obtenerAnios(this.selectedMarcaId!, this.selectedModeloId);
      this.form.get('anio')?.enable({ emitEvent: false });
    } else {
      this.form.get('anio')?.disable({ emitEvent: false });
    }
  }
  public onAnioSeleccionado(event: any) {
    const anio: number = event.detail.value;
    if (anio) {
      this.form.get('version')?.enable({ emitEvent: false });
      this.selectedAnioId = anio;
      this.obtenerVersion(this.selectedMarcaId!, this.selectedModeloId!, this.selectedAnioId);
    } else {
      this.form.get('version')?.disable({ emitEvent: false });
    }
  }
}