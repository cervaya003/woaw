import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpEventType, HttpResponse } from '@angular/common/http'; // 👈 NUEVO

import { GeneralService } from '../../../services/general.service';
import { RentaService } from '../../../services/renta.service';
import { CarsService } from '../../../services/cars.service';

import { MapaComponent } from '../../modal/mapa/mapa.component';
import { FotosVeiculoComponent } from '../../modal/fotos-veiculo/fotos-veiculo.component';

export interface RentaSubmitPayload {
  payload: any;
  files?: {
    imagenPrincipal: File;
    imagenes?: File[];
    tarjetaCirculacion?: File;
  };
}

@Component({
  selector: 'app-renta',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, ReactiveFormsModule],
  templateUrl: './renta.component.html',
  styleUrls: ['./renta.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentaComponent implements OnInit, OnChanges {
  @Input() anio!: number;
  @Input() marca!: string;
  @Input() modelo!: string;
  @Input() tipo!: 'renta' | 'auto' | 'moto' | 'camion' | 'lote';
  @Output() rentaSubmit = new EventEmitter<RentaSubmitPayload>();

  private readonly BASE_DISPO = '/disponibilidad-car';

  // --- estado UI ---
  direccionCompleta: string = 'Selecciona la ubicación...';
  ubicacionSeleccionada: [string, string, number, number] | null = null;

  imagenPrincipal: File | null = null;
  imagenesSecundarias: File[] = [];
  tarjetaCirculacion: File | null = null;

  imagenesIntentadas = false;
  imagenesValidas = false;

  version: string = '';
  tipoVehiculoLocal: string = '';
  transmision: string = '';
  combustible: string = '';
  color: string = '';
  colorOtra: string = '';
  pasajeros: number | null = null;
  kilometrajeActual: number | null = null;

  precioPorDia: number | null = null;
  moneda: 'MXN' | 'USD' = 'MXN';

  politicaCombustible: 'lleno-lleno' | 'como-esta' = 'lleno-lleno';
  politicaLimpieza: 'normal' | 'estricta' = 'normal';

  requisitosConductor = {
    edadMinima: 21,
    antiguedadLicenciaMeses: 12,
    permiteConductorAdicional: false as boolean,
    costoConductorAdicional: null as number | null,
  };

  entrega = {
    gratuitoHastaKm: 0,
    tarifasPorDistancia: [] as Array<{
      desdeKm: number;
      hastaKm: number;
      costoFijo?: number | null;
      costoPorKm?: number | null;
      nota?: string | null;
    }>,
  };

  polizaPlataforma: any = {
    numero: '',
    aseguradora: '',
    cobertura: '',
    vigenciaDesde: '',
    vigenciaHasta: '',
    urlPoliza: '',
    aseguradoraOtra: '',
  };

  opcionesColores = [
    { label: 'Blanco' }, { label: 'Negro' }, { label: 'Gris' }, { label: 'Plateado' },
    { label: 'Rojo' }, { label: 'Azul' }, { label: 'Azul marino' }, { label: 'Verde' },
    { label: 'Verde oscuro' }, { label: 'Beige' }, { label: 'Café' }, { label: 'Amarillo' },
    { label: 'Naranja' }, { label: 'Morado' }, { label: 'Vino' }, { label: 'Oro' },
    { label: 'Bronce' }, { label: 'Turquesa' }, { label: 'Gris Oxford' }, { label: 'Arena' },
    { label: 'Azul cielo' }, { label: 'Grafito' }, { label: 'Champagne' }, { label: 'Titanio' },
    { label: 'Cobre' }, { label: 'Camaleón' }, { label: 'Otro' },
  ];

  versiones: string[] = [];
  versionesDisponibles = false;
  especificacionesVersion: any = null;

  enviando = false;

  constructor(
    private modalController: ModalController,
    private generalService: GeneralService,
    private rentaService: RentaService,
    private carsService: CarsService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) { }

  ngOnInit() { this.obtenerVersiones(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['anio'] || changes['marca'] || changes['modelo']) this.obtenerVersiones();
  }

  // ---------- helpers ----------
  private trim = (v: any) => (typeof v === 'string' ? v.trim() : v);
  private numOrUndef = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  onColorChange(val: string) { if (val !== 'Otro') this.colorOtra = ''; }

  private validarImagenes(): boolean {
    const MAX_MB = 8;
    const tipos = ['image/jpeg', 'image/png', 'image/webp'];
    const archivos = [this.imagenPrincipal, ...(this.imagenesSecundarias || [])].filter(Boolean) as File[];
    if (!archivos.length) return false;
    for (const f of archivos) {
      if (f.type && !tipos.includes(f.type)) return false;
      if (f.size > MAX_MB * 1024 * 1024) return false;
    }
    return true;
  }

  // Extrae ID desde headers Location/X-Resource-Id
  private parseIdFromLocation(url?: string | null): string | null {
    if (!url) return null;
    try {
      // recorta query/fragment y toma el último segmento
      const clean = url.split('?')[0].replace(/\/+$/, '');
      const last = clean.split('/').pop() || '';
      const oid = /^[0-9a-f]{24}$/i;
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (oid.test(last) || uuid.test(last)) return last;
      return null;
    } catch { return null; }
  }

  // Búsqueda robusta del ID en objetos anidados
  private extractCreatedId(res: any): string | null {
    if (!res) return null;

    const tryKeys = (obj: any): string | null => {
      const keys = ['id', '_id', 'carId', 'vehicleId', 'vehiculoId', 'rentalId', 'rentId', 'autoId'];
      for (const k of keys) {
        const v = obj?.[k];
        if (typeof v === 'string' && v) return v;
        if (v && typeof v === 'object' && typeof v.$oid === 'string') return v.$oid; // mongo $oid
      }
      return null;
    };

    // 1) top-level
    const direct = tryKeys(res);
    if (direct) return direct;

    // 2) contenedores típicos
    const containers = ['data', 'car', 'auto', 'vehicle', 'vehiculo', 'rental', 'result', 'payload', 'response'];
    for (const c of containers) {
      const deep = res?.[c];
      if (deep) {
        const found = this.extractCreatedId(deep);
        if (found) return found;
      }
    }

    // 3) búsqueda profunda (cualquier nivel) en campos que terminen en "id"
    const seen = new Set<any>();
    const stack = [res];
    const oid = /^[0-9a-f]{24}$/i;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    while (stack.length) {
      const cur = stack.pop();
      if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
      seen.add(cur);
      for (const [k, v] of Object.entries(cur)) {
        if (typeof v === 'string' && (oid.test(v) || uuid.test(v)) && /(^|_)id$/i.test(k)) {
          return v;
        }
        if (v && typeof v === 'object') stack.push(v);
      }
    }
    return null;
  }

  private async goToDisponibilidad(id?: string | null) {
    if (!id) {
      await this.generalService.alert(
        'No encontré el ID',
        'No recibí el identificador del vehículo creado. No puedo abrir la disponibilidad.',
        'warning'
      );
      return;
    }
    const url = `${this.BASE_DISPO}/${id}`;
    this.router.navigateByUrl(url).then((navigated) => {
      if (!navigated) { window.location.href = url; return; }
      setTimeout(() => window.location.reload(), 0);
    }).catch(() => window.location.href = url);
  }

  // ---------- versiones ----------
  private obtenerVersiones() {
    this.versiones = [];
    this.versionesDisponibles = false;
    this.especificacionesVersion = null;

    if (!this.marca || !this.modelo || !this.anio) {
      this.cdr.markForCheck();
      return;
    }

    this.carsService.GetVersiones(Number(this.anio), this.marca, this.modelo).subscribe({
      next: (data: any[]) => {
        this.versiones = (data || []).filter(Boolean);
        this.versionesDisponibles = Array.isArray(this.versiones) && this.versiones.length > 0;
        this.cdr.markForCheck();
      },
      error: () => { this.versiones = []; this.versionesDisponibles = false; this.cdr.markForCheck(); },
    });
  }

  onSeleccionVersion(version: string) {
    this.version = version || '';
    this.especificacionesVersion = null;
    if (!this.version || !this.marca || !this.modelo || !this.anio) { this.cdr.markForCheck(); return; }

    this.carsService.EspesificacionesVersion(this.anio, this.marca, this.modelo, this.version).subscribe({
      next: (data: any) => {
        const spec = Array.isArray(data) ? data[0] : data;
        this.especificacionesVersion = spec || null;
        if (this.especificacionesVersion) {
          if (!this.transmision && spec.transmision) this.transmision = spec.transmision;
          if (!this.combustible && spec.combustible) this.combustible = spec.combustible;
          if ((this.pasajeros == null || isNaN(this.pasajeros as any)) && spec.pasajeros) this.pasajeros = Number(spec.pasajeros);
          if (!this.tipoVehiculoLocal && spec.tipoVehiculo) this.tipoVehiculoLocal = spec.tipoVehiculo;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.generalService.alert('Error', 'No se pudieron obtener las especificaciones de la versión.', 'danger');
        this.cdr.markForCheck();
      },
    });
  }

  // ---------- tarifas ----------
  private reencadenarDesde() {
    const arr = this.entrega.tarifasPorDistancia;
    if (!arr?.length) return;
    arr[0].desdeKm = Number(this.entrega.gratuitoHastaKm) || 0;
    for (let i = 1; i < arr.length; i++) arr[i].desdeKm = Number(arr[i - 1].hastaKm) || 0;
    this.cdr.markForCheck();
  }
  addTarifa() {
    const arr = this.entrega.tarifasPorDistancia;
    const desde = arr.length === 0
      ? (Number(this.entrega.gratuitoHastaKm) || 0)
      : (Number(arr[arr.length - 1].hastaKm) || 0);
    arr.push({ desdeKm: desde, hastaKm: desde + 10, costoFijo: null, costoPorKm: null, nota: null });
    this.cdr.markForCheck();
  }
  removeTarifa(i: number) { this.entrega.tarifasPorDistancia.splice(i, 1); this.reencadenarDesde(); }
  onGratisHastaChange() { this.reencadenarDesde(); }
  onTarifaHastaChange(i: number) {
    const arr = this.entrega.tarifasPorDistancia;
    if (i < arr.length - 1) arr[i + 1].desdeKm = Number(arr[i].hastaKm) || 0;
    this.cdr.markForCheck();
  }

  // ---------- ubicación / imágenes ----------
  async seleccionarUbicacion() {
    const modal = await this.modalController.create({ component: MapaComponent });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) {
      this.ubicacionSeleccionada = data as [string, string, number, number];
      if (this.ubicacionSeleccionada) {
        try {
          const dir = await this.generalService.obtenerDireccionDesdeCoordenadas(
            this.ubicacionSeleccionada[2], this.ubicacionSeleccionada[3]
          );
          this.direccionCompleta = dir;
        } catch { this.direccionCompleta = 'No se pudo obtener la dirección.'; }
      }
      this.cdr.markForCheck();
    }
  }

  async seleccionarImagenes() {
    const modal = await this.modalController.create({
      component: FotosVeiculoComponent,
      backdropDismiss: false,
      componentProps: { estadoVehiculo: 'Renta' },
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (!data) { this.imagenesValidas = false; this.imagenesIntentadas = false; this.cdr.markForCheck(); return; }

    this.imagenesIntentadas = true;
    this.imagenPrincipal = (data.imagenPrincipal as File) || null;
    this.imagenesSecundarias = (data.imagenesSecundarias as File[]) || [];

    if (!this.imagenPrincipal) {
      await this.generalService.alert('Falta imagen principal', 'Selecciona una imagen principal para continuar.', 'warning');
      this.imagenesValidas = false; this.cdr.markForCheck(); return;
    }
    this.imagenesValidas = this.validarImagenes();
    this.cdr.markForCheck();
  }

  onFileTC(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.tarjetaCirculacion = input.files[0]; this.cdr.markForCheck();
  }

  limpiarImagenes() {
    this.generalService.confirmarAccion(
      '¿Deseas eliminar las imágenes seleccionadas?',
      'Eliminar imágenes',
      () => {
        this.imagenPrincipal = null;
        this.imagenesSecundarias = [];
        this.imagenesIntentadas = false;
        this.imagenesValidas = false;
        this.cdr.markForCheck();
      }
    );
  }

  // ---------- validaciones ----------
  private validarFechasPoliza(): boolean {
    const { vigenciaDesde, vigenciaHasta } = this.polizaPlataforma;
    if (!vigenciaDesde || !vigenciaHasta) return false;
    const d1 = new Date(vigenciaDesde), d2 = new Date(vigenciaHasta);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return d1 <= d2 && d2 >= hoy;
  }

  validarBasico(): boolean {
    if (!this.marca || !this.modelo || !this.anio) { this.generalService.alert('Datos incompletos', 'Faltan marca, modelo o año.', 'warning'); return false; }
    if (!this.ubicacionSeleccionada) { this.generalService.alert('Ubicación', 'Selecciona la ubicación del vehículo.', 'warning'); return false; }
    const okPrecioDia = this.precioPorDia !== null && Number(this.precioPorDia) >= 500;
    if (!okPrecioDia) { this.generalService.alert('Precio por día', 'El precio por día debe ser de al menos $500.', 'warning'); return false; }
    if (this.pasajeros !== null && Number(this.pasajeros) < 1) { this.generalService.alert('Pasajeros', 'El número de pasajeros debe ser 1 o mayor.', 'warning'); return false; }
    if (this.kilometrajeActual !== null && Number(this.kilometrajeActual) < 0) { this.generalService.alert('Kilometraje', 'El kilometraje no puede ser negativo.', 'warning'); return false; }
    if (Number(this.requisitosConductor.edadMinima) < 18) { this.generalService.alert('Edad mínima', 'La edad mínima permitida es 18 años.', 'warning'); return false; }

    const p = this.polizaPlataforma;
    if (!p.numero || !p.aseguradora || !p.cobertura || !p.vigenciaDesde || !p.vigenciaHasta) {
      this.generalService.alert('Póliza', 'Completa los campos obligatorios de la póliza.', 'warning'); return false;
    }
    if (!this.validarFechasPoliza()) {
      this.generalService.alert('Vigencia de póliza', 'Fechas inválidas o póliza vencida.', 'warning'); return false;
    }
    if (p.aseguradora === 'Otro' && !this.trim(p.aseguradoraOtra)) {
      this.generalService.alert('Aseguradora', 'Especifica la aseguradora cuando eliges "Otro".', 'warning'); return false;
    }

    const hayTarifas = (this.entrega.tarifasPorDistancia || []).length > 0;
    const hayGratisHasta = Number(this.entrega.gratuitoHastaKm) > 0;
    if (!hayTarifas && !hayGratisHasta) {
      this.generalService.alert('Tarifas por distancia', 'Agrega al menos una tarifa o “Entrega gratis hasta (km)”.', 'warning'); return false;
    }

    for (let i = 0; i < (this.entrega.tarifasPorDistancia || []).length; i++) {
      const t = this.entrega.tarifasPorDistancia[i];
      const desde = Number(t.desdeKm), hasta = Number(t.hastaKm);
      const costoFijo = t.costoFijo != null ? Number(t.costoFijo) : null;
      const costoKm = t.costoPorKm != null ? Number(t.costoPorKm) : null;

      if (!Number.isFinite(desde) || desde < 0 || !Number.isFinite(hasta) || hasta <= 0) {
        this.generalService.alert('Tarifas por distancia', `Tarifa #${i + 1}: “Desde” ≥ 0 y “Hasta” > 0.`, 'warning'); return false;
      }
      if (desde >= hasta) {
        this.generalService.alert('Tarifas por distancia', `Tarifa #${i + 1}: “Desde” debe ser menor que “Hasta”.`, 'warning'); return false;
      }
      if ((costoFijo == null || costoFijo < 0) && (costoKm == null || costoKm < 0)) {
        this.generalService.alert('Tarifas por distancia', `Tarifa #${i + 1}: define “Costo fijo” o “Costo por km”.`, 'warning'); return false;
      }
      if (i > 0) {
        const prevHasta = Number(this.entrega.tarifasPorDistancia[i - 1].hastaKm) || 0;
        if (desde !== prevHasta) {
          this.generalService.alert('Tarifas por distancia', `Tarifa #${i + 1} debe iniciar en ${prevHasta} km.`, 'warning'); return false;
        }
      }
    }

    if (!this.imagenPrincipal || !this.validarImagenes()) {
      this.generalService.alert('Imágenes', 'Falta imagen principal o formato/tamaño inválido.', 'warning'); return false;
    }
    return true;
  }

  get canPublicar(): boolean {
    const okBasicos = !!this.marca && !!this.modelo && !!this.anio;
    const okUbi = this.ubicacionSeleccionada != null;
    const okPrecio = this.precioPorDia !== null && Number(this.precioPorDia) >= 500;
    const okPasajeros = this.pasajeros == null || Number(this.pasajeros) >= 1;
    const okKm = this.kilometrajeActual == null || Number(this.kilometrajeActual) >= 0;
    const okEdad = Number(this.requisitosConductor.edadMinima) >= 18;
    const p = this.polizaPlataforma;
    const okPolizaReq = !!p.numero && !!p.aseguradora && !!p.cobertura && !!p.vigenciaDesde && !!p.vigenciaHasta;
    const okPolizaFechas = okPolizaReq && this.validarFechasPoliza();
    const okAsegOtra = p.aseguradora !== 'Otro' || !!this.trim(p.aseguradoraOtra);
    const okImagen = !!this.imagenPrincipal && this.imagenesValidas;
    const hayTarifas = (this.entrega.tarifasPorDistancia || []).length > 0;
    const hayGratisHasta = Number(this.entrega.gratuitoHastaKm) > 0;
    const okTarifas = hayTarifas || hayGratisHasta;

    return okBasicos && okUbi && okPrecio && okPasajeros && okKm && okEdad
      && okPolizaFechas && okAsegOtra && okTarifas && okImagen && !this.enviando;
  }

  private construirPayload() {
    const ubicacion = this.ubicacionSeleccionada
      ? {
        ciudad: this.ubicacionSeleccionada[0],
        estado: this.ubicacionSeleccionada[1],
        lat: Number(this.ubicacionSeleccionada[2]),
        lng: Number(this.ubicacionSeleccionada[3]),
      }
      : undefined;

    const precio = { porDia: Number(this.precioPorDia ?? 0), moneda: this.moneda };

    const reqCond = {
      edadMinima: this.numOrUndef(this.requisitosConductor.edadMinima) ?? 21,
      antiguedadLicenciaMeses: this.numOrUndef(this.requisitosConductor.antiguedadLicenciaMeses) ?? 12,
      permiteConductorAdicional: !!this.requisitosConductor.permiteConductorAdicional,
      costoConductorAdicional: this.numOrUndef(this.requisitosConductor.costoConductorAdicional),
    };

    const entrega = {
      gratuitoHastaKm: this.numOrUndef(this.entrega.gratuitoHastaKm) ?? 0,
      tarifasPorDistancia: (this.entrega.tarifasPorDistancia || []).map((t) => ({
        desdeKm: this.numOrUndef(t.desdeKm)!,
        hastaKm: this.numOrUndef(t.hastaKm)!,
        costoFijo: this.numOrUndef(t.costoFijo),
        costoPorKm: this.numOrUndef(t.costoPorKm),
        nota: t.nota || undefined,
      })),
    };

    const colorFinal =
      this.color === 'Otro' && this.trim(this.colorOtra) ? this.trim(this.colorOtra) : this.color || undefined;

    const aseguradoraFinal =
      this.polizaPlataforma.aseguradora === 'Otro' && this.trim(this.polizaPlataforma.aseguradoraOtra)
        ? this.trim(this.polizaPlataforma.aseguradoraOtra)
        : this.polizaPlataforma.aseguradora;

    return {
      marca: (this.marca || '').trim(),
      modelo: (this.modelo || '').trim(),
      anio: Number(this.anio),

      version: this.version || undefined,
      tipoVehiculo: this.tipoVehiculoLocal || undefined,
      transmision: this.transmision || undefined,
      combustible: this.combustible || undefined,
      color: colorFinal,
      pasajeros: this.numOrUndef(this.pasajeros),
      kilometrajeActual: this.numOrUndef(this.kilometrajeActual),

      precio,

      politicaCombustible: this.politicaCombustible,
      politicaLimpieza: this.politicaLimpieza,

      requisitosConductor: reqCond,
      ubicacion,
      entrega,

      polizaPlataforma: {
        numero: (this.polizaPlataforma.numero || '').trim(),
        aseguradora: aseguradoraFinal as any,
        cobertura: this.polizaPlataforma.cobertura as any,
        vigenciaDesde: this.polizaPlataforma.vigenciaDesde,
        vigenciaHasta: this.polizaPlataforma.vigenciaHasta,
        urlPoliza: this.polizaPlataforma.urlPoliza || undefined,
      },
    };
  }

  // ---------- enviar ----------
  async publicar() {
    if (!this.validarBasico()) return;

    const payload = this.construirPayload();
    const files = {
      imagenPrincipal: this.imagenPrincipal!,
      imagenes: this.imagenesSecundarias || [],
      tarjetaCirculacion: this.tarjetaCirculacion || undefined,
    };

    this.enviando = true;
    this.cdr.markForCheck();
    await this.generalService.loading('Publicando vehículo de renta…');

    this.rentaService.addRentalCar({ ...payload, ...files } as any).subscribe({
      next: async (evt: any) => {
        // Si el servicio emite eventos (upload), espera hasta Response
        let resBody: any = evt;
        let headerId: string | null = null;

        if (evt && typeof evt === 'object' && 'type' in evt) {
          if (evt.type !== HttpEventType.Response) return; // aún no es la respuesta final
          const httpRes = evt as HttpResponse<any>;
          resBody = httpRes.body;

          // Intenta ID por headers
          headerId =
            this.parseIdFromLocation(httpRes.headers?.get('Location')) ||
            this.parseIdFromLocation(httpRes.headers?.get('X-Resource-Id')) ||
            null;
        }

        // Token/rol (si vienen)
        if (resBody?.token && resBody?.rol) {
          const userActual = JSON.parse(localStorage.getItem('user') || '{}');
          userActual.rol = resBody.rol;
          localStorage.setItem('user', JSON.stringify(userActual));
          localStorage.setItem('token', resBody.token);
        }

        await this.generalService.loadingDismiss();
        this.enviando = false;

        // Busca el ID en body (o headers si ya lo sacamos)
        const bodyId = this.extractCreatedId(resBody);
        const createdId = headerId || bodyId;

        if (!createdId) {
          console.warn('[RentaComponent] No se pudo extraer ID. Respuesta completa:', resBody);
          await this.generalService.alert(
            'No encontré el ID',
            'No recibí el identificador del vehículo creado. No puedo abrir la disponibilidad.',
            'warning'
          );
          this.cdr.markForCheck();
          return;
        }

        // Aviso no bloqueante y vamos a disponibilidad
        this.generalService.alert(
          '¡Listo!',
          'Vehículo de renta publicado. Vamos a configurar la disponibilidad.',
          'success'
        );

        await this.goToDisponibilidad(createdId);
        this.cdr.markForCheck();
      },
      error: async (err) => {
        await this.generalService.loadingDismiss();
        this.enviando = false;
        const msg = err?.error?.message || 'Error al publicar el vehículo de renta';
        this.generalService.alert('Error', msg, 'danger');
        console.error('[RentaComponent] Error addRentalCar:', err);
        this.cdr.markForCheck();
      },
    });
  }

  resetForm() {
    this.version = ''; this.tipoVehiculoLocal = ''; this.transmision = '';
    this.combustible = ''; this.color = ''; this.colorOtra = '';
    this.pasajeros = null; this.kilometrajeActual = null;

    this.precioPorDia = null; this.moneda = 'MXN';

    this.politicaCombustible = 'lleno-lleno';
    this.politicaLimpieza = 'normal';

    this.requisitosConductor = {
      edadMinima: 21,
      antiguedadLicenciaMeses: 12,
      permiteConductorAdicional: false,
      costoConductorAdicional: null,
    };

    this.entrega = { gratuitoHastaKm: 0, tarifasPorDistancia: [] };

    this.polizaPlataforma = {
      numero: '',
      aseguradora: '',
      cobertura: '',
      vigenciaDesde: '',
      vigenciaHasta: '',
      urlPoliza: '',
      aseguradoraOtra: '',
    };

    this.imagenPrincipal = null;
    this.imagenesSecundarias = [];
    this.tarjetaCirculacion = null;
    this.imagenesIntentadas = false;
    this.imagenesValidas = false;

    this.ubicacionSeleccionada = null;
    this.direccionCompleta = 'Selecciona la ubicación...';

    this.versiones = [];
    this.versionesDisponibles = false;
    this.especificacionesVersion = null;

    this.cdr.markForCheck();
  }
}
