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
  /** Tipo general del flujo (por si el padre lo usa). No lo enviamos al backend. */
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

  // Campos compatibles con el backend
  tipoVehiculoLocal: string = '';
  transmision: string = '';
  combustible: string = '';

  pasajeros: number | null = null;

  // === Extras ===
  extrasPredefinidos: string[] = [
    'Silla de bebé',
    'Elevador infantil',
    'GPS',
    'Wi-Fi portátil',
    'Portaequipaje',
    'Cadenas para nieve'
  ];
  extras: string[] = [];
  extraSeleccionado: string = '';
  extraOtroTexto: string = '';

  precioPorDia: number | null = null;

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

  enviando = false;

  constructor(
    private modalController: ModalController,
    private generalService: GeneralService,
    private rentaService: RentaService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit() {}
  ngOnChanges(_changes: SimpleChanges): void {}

  // ---------- helpers ----------
  private hasText(v: any): boolean { return ('' + (v ?? '')).trim().length > 0; }
  private numOrUndef = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };

  // ===== Extras handlers =====
  onExtraChange(val: string) {
    if (val !== '__OTRO__') this.extraOtroTexto = '';
  }

  agregarExtra() {
    let valor = '';
    if (this.extraSeleccionado === '__OTRO__') {
      valor = (this.extraOtroTexto || '').trim();
    } else {
      valor = (this.extraSeleccionado || '').trim();
    }
    if (!valor) return;

    // evita duplicados (case-insensitive)
    const ya = this.extras.some(e => e.toLowerCase() === valor.toLowerCase());
    if (!ya) this.extras.push(valor);

    // reset UI
    this.extraSeleccionado = '';
    this.extraOtroTexto = '';
    this.cdr.markForCheck();
  }

  quitarExtra(i: number) {
    this.extras.splice(i, 1);
    this.cdr.markForCheck();
  }

  limpiarExtras() {
    this.extras = [];
    this.extraSeleccionado = '';
    this.extraOtroTexto = '';
    this.cdr.markForCheck();
  }

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
  validarBasico(): boolean {
    if (!this.hasText(this.marca) || !this.hasText(this.modelo)) {
      this.generalService.alert('Datos incompletos', 'Faltan marca o modelo.', 'warning');
      return false;
    }
    if (!this.ubicacionSeleccionada) {
      this.generalService.alert('Ubicación', 'Selecciona la ubicación del vehículo.', 'warning');
      return false;
    }
    const okPrecioDia = this.precioPorDia !== null && Number(this.precioPorDia) >= 500;
    if (!okPrecioDia) {
      this.generalService.alert('Precio por día', 'El precio por día debe ser de al menos $500.', 'warning');
      return false;
    }
    if (this.pasajeros !== null && Number(this.pasajeros) < 1) {
      this.generalService.alert('Pasajeros', 'El número de pasajeros debe ser 1 o mayor.', 'warning');
      return false;

    }
    if (Number(this.requisitosConductor.edadMinima) < 18) {
      this.generalService.alert('Edad mínima', 'La edad mínima permitida es 18 años.', 'warning');
      return false;
    }

    const hayTarifas = (this.entrega.tarifasPorDistancia || []).length > 0;
    const hayGratisHasta = Number(this.entrega.gratuitoHastaKm) > 0;
    if (!hayTarifas && !hayGratisHasta) {
      this.generalService.alert('Tarifas por distancia', 'Agrega al menos una tarifa o “Entrega gratis hasta (km)”.', 'warning');
      return false;
    }

    for (let i = 0; i < (this.entrega.tarifasPorDistancia || []).length; i++) {
      const t = this.entrega.tarifasPorDistancia[i];
      const desde = Number(t.desdeKm), hasta = Number(t.hastaKm);
      const costoFijo = t.costoFijo != null ? Number(t.costoFijo) : null;
      const costoKm = t.costoPorKm != null ? Number(t.costoPorKm) : null;

      if (!Number.isFinite(desde) || desde < 0 || !Number.isFinite(hasta) || hasta <= 0) {

        this.generalService.alert('Tarifas por distancia', `Tarifa #${i + 1}: “Desde” ≥ 0 y “Hasta” > 0.`, 'warning');
        return false;
      }
      if (desde >= hasta) {
        this.generalService.alert('Tarifas por distancia', `Tarifa #${i + 1}: “Desde” debe ser menor que “Hasta”.`, 'warning');
        return false;
      }
      if ((costoFijo == null || costoFijo < 0) && (costoKm == null || costoKm < 0)) {
        this.generalService.alert('Tarifas por distancia', `Tarifa #${i + 1}: define “Costo fijo” o “Costo por km”.`, 'warning');
        return false;

      }
      if (i > 0) {
        const prevHasta = Number(this.entrega.tarifasPorDistancia[i - 1].hastaKm) || 0;
        if (desde !== prevHasta) {
          this.generalService.alert('Tarifas por distancia', `Tarifa #${i + 1} debe iniciar en ${prevHasta} km.`, 'warning');
          return false;
        }
      }
    }

    if (!this.imagenPrincipal || !this.validarImagenes()) {
      this.generalService.alert('Imágenes', 'Falta imagen principal o formato/tamaño inválido.', 'warning');
      return false;
    }
    return true;
  }

  get canPublicar(): boolean {

    const okBasicos = this.hasText(this.marca) && this.hasText(this.modelo);
    const okUbi = this.ubicacionSeleccionada != null;
    const okPrecio = this.precioPorDia !== null && Number(this.precioPorDia) >= 500;
    const okPasajeros = this.pasajeros == null || Number(this.pasajeros) >= 1;
    const okEdad = Number(this.requisitosConductor.edadMinima) >= 18;

    const okImagen = !!this.imagenPrincipal && this.imagenesValidas;
    const hayTarifas = (this.entrega.tarifasPorDistancia || []).length > 0;
    const hayGratisHasta = Number(this.entrega.gratuitoHastaKm) > 0;
    const okTarifas = hayTarifas || hayGratisHasta;

    return okBasicos && okUbi && okPrecio && okPasajeros && okEdad
      && okTarifas && okImagen && !this.enviando;
  }

  // ---------- payload SOLO con campos soportados ----------
  private construirPayloadParaBackend() {

    const ubicacion = this.ubicacionSeleccionada
      ? {
        ciudad: this.ubicacionSeleccionada[0],
        estado: this.ubicacionSeleccionada[1],
        lat: Number(this.ubicacionSeleccionada[2]),
        lng: Number(this.ubicacionSeleccionada[3]),
      }
      : undefined;

    const reqCond = {
      edadMinima: Number(this.requisitosConductor.edadMinima) || 21,
      antiguedadLicenciaMeses: Number(this.requisitosConductor.antiguedadLicenciaMeses) || 12,

      permiteConductorAdicional: !!this.requisitosConductor.permiteConductorAdicional,
      costoConductorAdicional: this.numOrUndef(this.requisitosConductor.costoConductorAdicional),
    };

    const entrega = {
      gratuitoHastaKm: Number(this.entrega.gratuitoHastaKm) || 0,

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

      tipoVehiculo: this.tipoVehiculoLocal || undefined,
      pasajeros: this.numOrUndef(this.pasajeros),

      transmision: this.transmision || undefined,
      combustible: this.combustible || undefined,

      precio: Number(this.precioPorDia ?? 0),


      politicaCombustible: this.politicaCombustible,
      politicaLimpieza: this.politicaLimpieza,

      requisitosConductor: reqCond,
      
      ubicacion,
      entrega,

      // 👇 NUEVO: extras opcionales (si hay)
      extras: this.extras?.length ? [...this.extras] : undefined,

    };
  }

  // ---------- enviar ----------
  async publicar() {
    if (!this.validarBasico()) return;

    const payload = this.construirPayloadParaBackend();
    const files = {
      imagenPrincipal: this.imagenPrincipal!, // validado arriba
      imagenes: this.imagenesSecundarias || [],
      tarjetaCirculacion: this.tarjetaCirculacion || null,
    };

    this.enviando = true;
    this.cdr.markForCheck();
    await this.generalService.loading('Publicando vehículo de renta…');

    this.rentaService.addRentalCar({ ...payload, ...files } as any).subscribe({

      next: async (res) => {
        await this.generalService.loadingDismiss();
        this.enviando = false;

        if (res?.token) localStorage.setItem('token', res.token);
        if (res?.rol) {
          const userActual = JSON.parse(localStorage.getItem('user') || '{}');
          userActual.rol = res.rol;
          localStorage.setItem('user', JSON.stringify(userActual));
        }

        const idCreado = res?.rental?._id || res?.rental?.id;
        if (!idCreado) {

          await this.generalService.alert(
            'No encontré el ID',
            'No recibí el identificador del vehículo creado. No puedo abrir la disponibilidad.',
            'warning'
          );
          this.cdr.markForCheck();
          return;
        }

        this.generalService.alert(
          '¡Listo!',
          'Vehículo de renta publicado. Vamos a configurar la disponibilidad.',
          'success'
        );

        await this.goToDisponibilidad(idCreado);

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
    this.tipoVehiculoLocal = '';
    this.transmision = '';
    this.combustible = '';
    this.pasajeros = null;

    this.precioPorDia = null;

    // extras
    this.extras = [];
    this.extraSeleccionado = '';
    this.extraOtroTexto = '';


    this.politicaCombustible = 'lleno-lleno';
    this.politicaLimpieza = 'normal';

    this.requisitosConductor = {
      edadMinima: 21,
      antiguedadLicenciaMeses: 12,
      permiteConductorAdicional: false,
      costoConductorAdicional: null,
    };

    this.entrega = { gratuitoHastaKm: 0, tarifasPorDistancia: [] };

    this.imagenPrincipal = null;
    this.imagenesSecundarias = [];
    this.tarjetaCirculacion = null;
    this.imagenesIntentadas = false;
    this.imagenesValidas = false;

    this.ubicacionSeleccionada = null;
    this.direccionCompleta = 'Selecciona la ubicación...';

    this.cdr.markForCheck();
  }
}
