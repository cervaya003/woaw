import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { GeneralService } from '../../../services/general.service';
import { RentaService } from '../../../services/renta.service';

// Reusa tus modales existentes:
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
})
export class RentaComponent implements OnInit {
  @Input() anio!: number;
  @Input() marca!: string;
  @Input() modelo!: string;
  @Input() tipo!: 'renta' | 'auto' | 'moto' | 'camion' | 'lote';

  @Output() rentaSubmit = new EventEmitter<RentaSubmitPayload>();

  // UI/estado base (similar a CarComponent)
  direccionCompleta: string = 'Selecciona la ubicación...';
  ubicacionSeleccionada: [string, string, number, number] | null = null; // [ciudad, estado, lat, lng]

  // Imágenes
  imagenPrincipal: File | null = null;
  imagenesSecundarias: File[] = [];
  tarjetaCirculacion: File | null = null;

  imagenesIntentadas = false;
  imagenesValidas = false;

  // Campos de ficha rápida (opcionales, pero útiles para filtrar/listar)
  version: string = '';
  tipoVehiculo: string = '';
  transmision: string = '';
  combustible: string = '';
  color: string = '';
  pasajeros: number | null = null;
  kilometrajeActual: number | null = null;

  // Precio (solo por día)
  precioPorDia: number | null = null;
  moneda: 'MXN' | 'USD' = 'MXN';

  // Políticas / requisitos (opcionales)
  politicaCombustible: 'lleno-lleno' | 'como-esta' = 'lleno-lleno';
  politicaLimpieza: 'normal' | 'estricta' = 'normal';

  requisitosConductor = {
    edadMinima: 21,
    antiguedadLicenciaMeses: 12,
    permiteConductorAdicional: false,
    costoConductorAdicional: null as number | null,
  };

  // Entrega (opcional)
  entrega = {
    gratuitoHastaKm: 0,
    tarifasPorDistancia: [] as Array<{
      desdeKm: number;
      hastaKm: number;
      costoFijo?: number | null;
      costoPorKm?: number | null;
      nota?: string | null;
    }>
  };

  // Póliza (OBLIGATORIA)
  polizaPlataforma = {
    numero: '',
    aseguradora: '', // Uber | DiDi | inDrive | Cabify | Otro
    cobertura: '',   // RC | Amplia | Amplia Plus
    vigenciaDesde: '',
    vigenciaHasta: '',
    urlPoliza: '',
  };

  // Flags
  enviando = false;

  constructor(
    private modalController: ModalController,
    private generalService: GeneralService,
    private rentaService: RentaService
  ) { }

  ngOnInit() {
    // nada especial por ahora
  }

  // ====== UBICACIÓN ======
  async seleccionarUbicacion() {
    const modal = await this.modalController.create({ component: MapaComponent });
    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data) {
      this.ubicacionSeleccionada = data;
      if (this.ubicacionSeleccionada) {
        this.generalService
          .obtenerDireccionDesdeCoordenadas(this.ubicacionSeleccionada[2], this.ubicacionSeleccionada[3])
          .then(dir => (this.direccionCompleta = dir))
          .catch(() => (this.direccionCompleta = 'No se pudo obtener la dirección.'));
      }
    }
  }

  // ====== IMÁGENES ======
  async seleccionarImagenes() {
    const modal = await this.modalController.create({
      component: FotosVeiculoComponent,
      backdropDismiss: false,
      componentProps: { estadoVehiculo: 'Renta' },
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (!data) {
      this.imagenesValidas = false;
      this.imagenesIntentadas = false;
      return;
    }

    this.imagenesIntentadas = true;
    this.imagenPrincipal = data.imagenPrincipal || null;
    this.imagenesSecundarias = data.imagenesSecundarias || [];

    if (!this.imagenPrincipal) {
      this.generalService.alert('Falta imagen principal', 'Selecciona una imagen principal para continuar.', 'warning');
      this.imagenesValidas = false;
      return;
    }

    this.imagenesValidas = true;
  }

  onFileTC(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.tarjetaCirculacion = input.files[0];
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
      }
    );
  }

  // ====== VALIDACIONES ======
  validarBasico(): boolean {
    // marca/modelo/año
    if (!this.marca || !this.modelo || !this.anio) {
      this.generalService.alert('Datos incompletos', 'Faltan marca, modelo o año.', 'warning');
      return false;
    }

    // precio
    const okPrecioDia = this.precioPorDia !== null && this.precioPorDia >= 0;
    if (!okPrecioDia) {
      this.generalService.alert('Precio por día', 'El precio por día es obligatorio y debe ser ≥ 0.', 'warning');
      return false;
    }

    // póliza
    const p = this.polizaPlataforma;
    if (!p.numero || !p.aseguradora || !p.cobertura || !p.vigenciaDesde || !p.vigenciaHasta) {
      this.generalService.alert('Póliza', 'Completa los campos obligatorios de la póliza.', 'warning');
      return false;
    }

    // imagen principal
    if (!this.imagenPrincipal) {
      this.generalService.alert('Imágenes', 'Selecciona la imagen principal.', 'warning');
      return false;
    }

    return true;
  }

  // ====== PREPARAR PAYLOAD ======
  construirPayload() {
    const ubicacion = this.ubicacionSeleccionada
      ? {
        ciudad: this.ubicacionSeleccionada[0],
        estado: this.ubicacionSeleccionada[1],
        lat: this.ubicacionSeleccionada[2],
        lng: this.ubicacionSeleccionada[3],
      }
      : undefined;

    const precio = {
      porDia: Number(this.precioPorDia ?? 0),
      moneda: this.moneda,
    };

    // entrega / requisitos pueden quedar vacíos si no se llenan
    const reqCond = {
      edadMinima: this.requisitosConductor.edadMinima ?? 21,
      antiguedadLicenciaMeses: this.requisitosConductor.antiguedadLicenciaMeses ?? 12,
      permiteConductorAdicional: !!this.requisitosConductor.permiteConductorAdicional,
      costoConductorAdicional:
        this.requisitosConductor.costoConductorAdicional != null
          ? Number(this.requisitosConductor.costoConductorAdicional)
          : undefined,
    };

    const entrega = {
      gratuitoHastaKm: Number(this.entrega.gratuitoHastaKm || 0),
      tarifasPorDistancia: (this.entrega.tarifasPorDistancia || []).map(t => ({
        desdeKm: Number(t.desdeKm),
        hastaKm: Number(t.hastaKm),
        costoFijo: t.costoFijo != null ? Number(t.costoFijo) : undefined,
        costoPorKm: t.costoPorKm != null ? Number(t.costoPorKm) : undefined,
        nota: t.nota || undefined,
      })),
    };

    return {
      marca: this.marca,
      modelo: this.modelo,
      anio: this.anio,
      version: this.version || undefined,
      tipoVehiculo: this.tipoVehiculo || undefined,
      transmision: this.transmision || undefined,
      combustible: this.combustible || undefined,
      color: this.color || undefined,
      pasajeros: this.pasajeros != null ? Number(this.pasajeros) : undefined,
      kilometrajeActual: this.kilometrajeActual != null ? Number(this.kilometrajeActual) : undefined,

      precio,
      politicaCombustible: this.politicaCombustible,
      politicaLimpieza: this.politicaLimpieza,
      requisitosConductor: reqCond,

      ubicacion,
      entrega,

      polizaPlataforma: {
        numero: this.polizaPlataforma.numero,
        aseguradora: this.polizaPlataforma.aseguradora,
        cobertura: this.polizaPlataforma.cobertura,
        vigenciaDesde: this.polizaPlataforma.vigenciaDesde,
        vigenciaHasta: this.polizaPlataforma.vigenciaHasta,
        urlPoliza: this.polizaPlataforma.urlPoliza || undefined,
      },
    };
  }

  // ====== ENVIAR ======
  async publicar() {
    if (!this.validarBasico()) return;

    const payload = this.construirPayload();

    const files = {
      imagenPrincipal: this.imagenPrincipal!,
      imagenes: this.imagenesSecundarias || [],
      tarjetaCirculacion: this.tarjetaCirculacion || undefined,
    };

    this.generalService.loading('Publicando vehículo de renta…');
    this.enviando = true;

    this.rentaService
      .addRentalCar({
        ...payload,
        ...files,
      } as any)
      .subscribe({
        next: (res: any) => {
          // si backend regresó token/rol, reflejar (igual que haces en CarComponent)
          if (res?.token && res?.rol) {
            const userActual = JSON.parse(localStorage.getItem('user') || '{}');
            userActual.rol = res.rol;
            localStorage.setItem('user', JSON.stringify(userActual));
            localStorage.setItem('token', res.token);
          }

          this.generalService.loadingDismiss();
          this.enviando = false;
          this.generalService.alert('¡Listo!', 'Vehículo de renta publicado correctamente.', 'success');

          // Emitir por si el padre quiere reaccionar / navegar
          this.rentaSubmit.emit({ payload, files });

          // Limpieza simple
          this.resetForm();
        },
        error: (err) => {
          this.generalService.loadingDismiss();
          this.enviando = false;
          const msg = err?.error?.message || 'Error al publicar el vehículo de renta';
          this.generalService.alert('Error', msg, 'danger');
          console.error(err);
        },
      });
  }

  resetForm() {
    this.version = '';
    this.tipoVehiculo = '';
    this.transmision = '';
    this.combustible = '';
    this.color = '';
    this.pasajeros = null;
    this.kilometrajeActual = null;

    this.precioPorDia = null;
    this.moneda = 'MXN';

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
    };

    this.imagenPrincipal = null;
    this.imagenesSecundarias = [];
    this.tarjetaCirculacion = null;
    this.imagenesIntentadas = false;
    this.imagenesValidas = false;

    this.ubicacionSeleccionada = null;
    this.direccionCompleta = 'Selecciona la ubicación...';
  }
}
