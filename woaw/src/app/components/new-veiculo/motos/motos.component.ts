import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
} from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { MotosService } from '../../../services/motos.service';
import { GeneralService } from '../../../services/general.service';
import { MapaComponent } from '../../modal/mapa/mapa.component';
import { FotosVeiculoComponent } from '../../modal/fotos-veiculo/fotos-veiculo.component';
import { Router } from '@angular/router';
import { RegistroService } from '../../../services/registro.service';
import { ContactosService } from './../../../services/contactos.service';

@Component({
  selector: 'app-motos',
  templateUrl: './motos.component.html',
  styleUrls: ['./motos.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MotosComponent implements OnInit {
  // Estado visible y lógico (igual que en car.ts)
  estadoVehiculo: 'Nuevo' | 'Usado' | 'Seminuevo' | '' = '';
  estadoVehiculo_logico: 'nuevo' | 'usado' | 'seminuevo' | 'viejito' | '' = '';

  @Input() anio!: number;
  @Input() marca!: string;
  @Input() modelo!: string;
  @Input() tipo!: string;

  // Catálogo de versiones / ficha técnica (paridad con car.ts)
  versiones: any[] = [];
  versionesDisponibles: boolean = false;
  esUsadoAntiguo: boolean = false;
  versionSeleccionada: boolean[] = [];
  preciosVersiones: { [version: string]: number } = {};
  versionSeleccionadaTexto: string = '';

  especificacionesVersion: any = {
    motor: '',
    cilindrada: '',
    potencia: '',
    cilindros: '',
    combustible: '',
    transmision: '',
    traccion: '',
    pasajeros: '',
    puertas: '',
    rines: '',
    tipoVehiculo: '',
    extra: [] as string[],
  };

  camposViejito: Record<string, string> = {
    motor: '',
    cilindrada: '',
    potencia: '',
    cilindros: '',
    combustible: '',
    transmision: '',
    traccion: '',
    pasajeros: '',
    puertas: '',
    rines: '',
    tipoVehiculo: '',
  };

  camposEspecificaciones: string[] = [
    'motor',
    'cilindrada',
    'potencia',
    'cilindros',
    'combustible',
    'transmision',
    'traccion',
    'pasajeros',
    'puertas',
    'rines',
    'tipoVehiculo',
    // 'extra' se maneja aparte si lo usas como array
  ];

  ejemplosCampos: Record<string, string> = {
    motor: 'Monocilíndrico 4T',
    cilindrada: '150cc',
    potencia: '18 hp',
    cilindros: '1',
    combustible: 'Gasolina',
    transmision: 'Manual 6 vel',
    traccion: 'Cadena',
    pasajeros: '2',
    puertas: '—',
    rines: '17 pulgadas',
    tipoVehiculo: 'Deportiva',
  };

  etiquetasCampos: Record<string, string> = {
    motor: 'Motor',
    cilindrada: 'Cilindrada',
    potencia: 'Potencia',
    cilindros: 'Cilindros',
    combustible: 'Combustible',
    transmision: 'Transmisión',
    traccion: 'Tracción',
    pasajeros: 'Pasajeros',
    puertas: 'Puertas',
    rines: 'Rines',
    tipoVehiculo: 'Tipo de vehículo',
  };

  // Ubicación / lote / UI
  ubicacionSeleccionada: [string, string, number, number] | null = null;
  direccionCompleta: string = 'Obteniendo ubicación...';
  imagenesIntentadas: boolean = false;

  colorSeleccionado: string[] = [];       // nuevo: múltiples
  colorSeleccionadoUnico: string = '';    // usado: uno
  lotes: any[] = [];
  listaAnios: number[] = [];
  totalLotes: number = 0;

  precio: number = 0;
  placas: string = '';
  kilometraje: number | null = null;
  descripcion: string = '';
  moneda: 'MXN' | 'USD' = 'MXN';
  extrasTexto: string = '';
  tipoMotor: string = '';
  cilindrada: string = '';
  transmision: string = '';
  combustible: string = '';
  frenos: string = '';
  suspension: string = '';

  public Pregunta: 'no' | 'si' | null = null;
  tipoSeleccionado: 'particular' | 'lote' = 'particular';
  ubicacionesLoteLegibles: string[] = [];

  loteSeleccionado: string | null = null;
  direccionSeleccionada: any = null;
  ubicacionesLoteSeleccionado: any[] = [];
  seccionFormulario: 1 | 2 | 3 = 1;

  nombreMoto: string = '';
  anioMoto: number | null = null;
  precioEstimado: number | null = null;
  tipoFactura: string = '';

  public MyRole: 'admin' | 'lotero' | 'vendedor' | 'cliente' | null = null;

  opciones = [
    { label: 'Blanco' }, { label: 'Negro' }, { label: 'Gris' }, { label: 'Plateado' },
    { label: 'Rojo' }, { label: 'Azul' }, { label: 'Azul marino' }, { label: 'Azul cielo' },
    { label: 'Verde' }, { label: 'Verde oscuro' }, { label: 'Color militar' },
    { label: 'Beige' }, { label: 'Café' }, { label: 'Amarillo' }, { label: 'Naranja' },
    { label: 'Morado' }, { label: 'Vino' }, { label: 'Oro' }, { label: 'Bronce' },
    { label: 'Turquesa' }, { label: 'Gris Oxford' }, { label: 'Arena' }, { label: 'Grafito' },
    { label: 'Champagne' }, { label: 'Titanio' }, { label: 'Cobre' }, { label: 'Camaleón' },
    { label: 'Perlado' }, { label: 'Mate' }, { label: 'Negro obsidiana' }, { label: 'Blanco perla' },
    { label: 'Rojo cereza' }, { label: 'Azul eléctrico' }, { label: 'Gris plomo' },
  ];

  imagenesValidas: boolean = false;
  imagenPrincipal: File | null = null;
  imagenesSecundarias: File[] = [];

  constructor(
    private fb: FormBuilder,
    private generalService: GeneralService,
    private modalController: ModalController,
    private router: Router,
    private registroService: RegistroService,
    private motosService: MotosService,
    public ContactosService: ContactosService,
  ) {}

  ngOnInit() {
    this.generalService.tipoRol$.subscribe((rol) => {
      if (rol === 'admin' || rol === 'lotero' || rol === 'vendedor' || rol === 'cliente') {
        this.MyRole = rol;
      } else {
        this.generalService.eliminarToken();
        this.generalService.alert('¡Saliste de tu sesión Error - 707!', '¡Hasta pronto!', 'info');
      }
    });

    if (this.MyRole === 'admin') {
      this.Pregunta = 'si';
      this.seccionFormulario = 2;
    } else if (this.MyRole === 'lotero') {
      this.Pregunta = 'no';
      this.seccionFormulario = 2;
      this.tipoSeleccionado = 'lote';
      this.getLotes('mios');
    } else {
      this.Pregunta = 'no';
      this.seccionFormulario = 1;
      this.tipoSeleccionado = 'particular';
    }

    this.obtenerVersiones(); // define estado lógico también
  }

  // ====== Paridad con car.ts ======
  definirEstadoVehiculo() {
    const anioActual = new Date().getFullYear();

    if (this.anio === anioActual && this.MyRole == 'admin') {
      this.estadoVehiculo = 'Nuevo';
      this.estadoVehiculo_logico = 'nuevo';
    } else if (this.anio === anioActual && this.MyRole != 'admin') {
      this.estadoVehiculo = 'Seminuevo';
      this.estadoVehiculo_logico = 'seminuevo';
    } else if (this.anio >= anioActual - 4) {
      this.estadoVehiculo = 'Seminuevo';
      this.estadoVehiculo_logico = 'seminuevo';
    } else if (this.anio < 2008 && this.anio >= 1800) {
      this.estadoVehiculo = 'Usado';
      this.estadoVehiculo_logico = 'viejito';
    } else {
      this.estadoVehiculo = 'Usado';
      this.estadoVehiculo_logico = 'usado';
    }

    this.esUsadoAntiguo =
      this.estadoVehiculo === 'Usado' && this.anio < 2008 && this.anio >= 1800;
  }

  obtenerVersiones() {
    if (this.modelo && this.anio && this.marca) {
      const anio = Number(this.anio);

      // Intento de catálogo (si tu servicio lo tiene). El "as any" evita error si no existe el método.
      const svc: any = this.motosService as any;

      if (svc && typeof svc.GetVersiones === 'function') {
        svc.GetVersiones(anio, this.marca, this.modelo).subscribe({
          next: (data: any[]) => {
            this.versiones = data || [];
            this.versionesDisponibles = Array.isArray(this.versiones) && this.versiones.length > 0;
            this.generalService.loadingDismiss();
            this.definirEstadoVehiculo();
          },
          error: (_e: any) => {
            this.generalService.loadingDismiss();
            this.versiones = [];
            this.versionesDisponibles = false;
            this.definirEstadoVehiculo();
          },
        });
      } else {
        // Sin endpoint: continua normal con viejito/manual
        this.versiones = [];
        this.versionesDisponibles = false;
        this.definirEstadoVehiculo();
      }
    } else {
      this.definirEstadoVehiculo();
    }
  }

  onSeleccionVersion(version: string) {
    const svc: any = this.motosService as any;
    if (this.modelo && this.anio && this.marca && svc && typeof svc.EspesificacionesVersion === 'function') {
      svc.EspesificacionesVersion(this.anio, this.marca, this.modelo, version).subscribe({
        next: (data: any) => {
          this.especificacionesVersion = data?.[0] || null;
        },
        error: (_err: any) => {
          this.generalService.alert('Error', 'No se pudieron obtener las especificaciones. Intenta nuevamente.', 'danger');
        },
        complete: () => this.generalService.loadingDismiss(),
      });
    } else {
      this.especificacionesVersion = null;
    }
  }

  seleccionarTipo(tipo: 'particular' | 'lote') {
    this.tipoSeleccionado = tipo;
  }

  continuar() {
    if (!this.tipoSeleccionado) return;
    if (this.tipoSeleccionado == 'lote') this.getLotes('all');
    this.Pregunta = 'no';
  }

  getLotes(tipo: 'all' | 'mios') {
    this.registroService.allLotes(tipo).subscribe({
      next: async (res) => {
        this.lotes = res.lotes;
        this.totalLotes = this.lotes.length;

        if (this.lotes.length === 1) {
          const loteUnico = this.lotes[0];
          this.loteSeleccionado = loteUnico._id;
          this.ubicacionesLoteSeleccionado = loteUnico.direccion;
          this.leerLatLng();
        }
      },
      error: async () => {
        await this.generalService.loadingDismiss();
        await this.generalService.alert('Verifica tu red', 'Error de red. Intenta más tarde.', 'danger');
      },
    });
  }

  onLoteSeleccionado() {
    const lote = this.lotes.find(l => l._id === this.loteSeleccionado);
    this.ubicacionesLoteSeleccionado = lote?.direccion || [];
    this.leerLatLng();
  }

  leerLatLng() {
    if (this.ubicacionesLoteSeleccionado.length === 1) {
      this.direccionSeleccionada = this.ubicacionesLoteSeleccionado[0];
      this.generalService.obtenerDireccionDesdeCoordenadas(
        this.direccionSeleccionada.lat,
        this.direccionSeleccionada.lng
      )
        .then((direccion) => this.direccionCompleta = direccion)
        .catch((_error) => this.direccionCompleta = 'No se pudo obtener la dirección.');
    } else {
      this.direccionSeleccionada = null;
      this.ubicacionesLoteLegibles = [];
      const promesas = this.ubicacionesLoteSeleccionado.map((dir) =>
        this.generalService.obtenerDireccionDesdeCoordenadas(dir.lat, dir.lng)
      );
      Promise.all(promesas)
        .then((direcciones) => this.ubicacionesLoteLegibles = direcciones)
        .catch((_error) => {
          this.ubicacionesLoteLegibles =
            this.ubicacionesLoteSeleccionado.map(() => 'No disponible');
        });
    }
  }

  async seleccionarUbicacion() {
    const modal = await this.modalController.create({ component: MapaComponent });
    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data) {
      this.ubicacionSeleccionada = data;
      if (this.ubicacionSeleccionada) {
        this.generalService
          .obtenerDireccionDesdeCoordenadas(this.ubicacionSeleccionada[2], this.ubicacionSeleccionada[3])
          .then((direccion) => (this.direccionCompleta = direccion))
          .catch(() => (this.direccionCompleta = 'No se pudo obtener la dirección.'));
      }
    }
  }

  async seleccionarImagenes() {
    const modal = await this.modalController.create({
      component: FotosVeiculoComponent,
      backdropDismiss: false,
      componentProps: { estadoVehiculo: this.estadoVehiculo },
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data) {
      this.imagenesIntentadas = true;
      this.imagenPrincipal = data.imagenPrincipal;
      this.imagenesSecundarias = data.imagenesSecundarias;

      if (this.estadoVehiculo === 'Nuevo') {
        if (!this.imagenPrincipal) {
          this.generalService.alert('Falta imagen principal', 'Selecciona una imagen principal para continuar.', 'warning');
          this.imagenesValidas = false;
          return;
        }
        this.imagenesValidas = true;
      }

      if (this.estadoVehiculo === 'Seminuevo' || this.estadoVehiculo === 'Usado') {
        if (!this.imagenPrincipal) {
          this.generalService.alert('Falta imagen principal', 'Selecciona una imagen principal para continuar.', 'warning');
          this.imagenesValidas = false;
          return;
        }
        if (this.imagenesSecundarias.length < 2) {
          this.generalService.alert('Imágenes insuficientes', 'Debes seleccionar al menos 2 imágenes secundarias.', 'warning');
          this.imagenesValidas = false;
          return;
        }
        this.imagenesValidas = true;
      }
    } else {
      this.imagenesValidas = false;
    }
  }

  limpiarImagenes() {
    this.generalService.confirmarAccion(
      '¿Estás seguro de que deseas eliminar las imágenes seleccionadas?',
      'Eliminar imágenes',
      () => {
        this.imagenPrincipal = null;
        this.imagenesSecundarias = [];
        this.imagenesValidas = false;
        this.imagenesIntentadas = false;
      }
    );
  }

  toggleVersion(index: number, version: string): void {
    this.versionSeleccionada[index] = !this.versionSeleccionada[index];
    if (!this.versionSeleccionada[index]) delete this.preciosVersiones[version];
  }

  // ====== Envío ======
  async EnviarVeiculo() {
    let validado = false;
    let appdata: FormData | false = false;

    validado = await this.validacionesAntesdeEnviarMoto();
    if (validado) appdata = await this.prepararFormularioParaEnvioMoto();

    if (!validado || !appdata) return;

    this.generalService.confirmarAccion(
      '¿Estás seguro de que deseas enviar esta información?',
      'Confirmar envío',
      async () => { await this.enviarDatos(appdata as FormData); },
      'Al continuar, confirmas que los datos proporcionados sobre tu vehículo son correctos y estás consciente de que serán publicados.'
    );
  }

  async enviarDatos(appdata: FormData) {
    this.generalService.loading('Guardando moto...');
    this.motosService.guardarMoto(appdata).subscribe({
      next: (res: any) => {
        this.generalService.loadingDismiss();
        if (res.token && res.rol) {
          const userActual = JSON.parse(localStorage.getItem('user') || '{}');
          userActual.rol = res.rol;
          localStorage.setItem('user', JSON.stringify(userActual));
          localStorage.setItem('token', res.token);
        }
        this.router.navigate(['/mis-motos']);
        this.generalService.alert('¡Moto agregada correctamente!', 'La motocicleta fue agregada correctamente.', 'success');
      },
      error: () => {
        this.generalService.loadingDismiss();
        this.generalService.alert('¡Algo salió mal!', 'Ocurrió un error inesperado. Por favor, intenta nuevamente.', 'danger');
      },
      complete: () => this.generalService.loadingDismiss(),
    });
  }

  // ====== Validaciones ======
  private validarUbicacion(): boolean {
    const esParticular = this.tipoSeleccionado === 'particular';
    const esLote = this.tipoSeleccionado === 'lote';

    if (esParticular) {
      const valida =
        this.ubicacionSeleccionada &&
        this.ubicacionSeleccionada.length === 4 &&
        typeof this.ubicacionSeleccionada[2] === 'number' &&
        typeof this.ubicacionSeleccionada[3] === 'number';

      if (!valida) {
        this.generalService.alert('Ubicación requerida', 'Selecciona la ubicación del vehículo en el mapa.', 'warning');
        return false;
      }
      return true;
    }

    if (esLote) {
      const lote = this.lotes.find(l => l._id === this.loteSeleccionado);
      if (!lote) {
        this.generalService.alert('Lote requerido', 'Selecciona un lote válido.', 'warning');
        return false;
      }
      if (lote.direccion.length > 1 && !this.direccionSeleccionada) {
        this.generalService.alert('Ubicación del lote requerida', 'Selecciona una ubicación específica del lote.', 'warning');
        return false;
      }
      return true;
    }

    return false;
  }

  async validacionesAntesdeEnviarMoto(): Promise<boolean> {
    // Ubicación según tipo (igual que car.ts)
    if (!this.validarUbicacion()) return false;

    // Precio
    if (this.precio < 5000 || this.precio > 5000000) {
      this.generalService.alert('Precio inválido', 'El precio debe estar entre 5000 y 5,000,000.', 'warning');
      return false;
    }

    // Placas (opcional)
    if (this.placas && this.placas.trim() !== '') {
      const longitud = this.placas.trim().length;
      const formatoValido = /^[A-Za-z0-9-]+$/.test(this.placas);
      if (longitud < 6 || longitud > 12 || !formatoValido) {
        this.generalService.alert('Placas inválidas', 'Las placas deben tener entre 6 y 12 caracteres y solo pueden incluir letras, números y guiones.', 'warning');
        return false;
      }
    }

    // Kilometraje
    const kilometrajeValido =
      this.kilometraje !== null &&
      Number.isInteger(this.kilometraje) &&
      this.kilometraje >= 0;
    if (!kilometrajeValido) {
      this.generalService.alert('Kilometraje inválido', 'El kilometraje debe ser un número valido entero positivo.', 'warning');
      return false;
    }
    if (this.kilometraje !== null && this.kilometraje > 180000) {
      this.generalService.alert('Kilometraje elevado', 'Este vehículo tiene más de 180,000 km. Puede ser difícil de vender o requerir mantenimiento importante.', 'info');
      return false;
    }

    // Color
    if (this.estadoVehiculo === 'Nuevo') {
      if (!this.colorSeleccionado || this.colorSeleccionado.length === 0) {
        this.generalService.alert('Color requerido', 'Por favor, selecciona al menos un color para el vehículo nuevo.', 'warning');
        return false;
      }
    } else {
      if (!this.colorSeleccionadoUnico || this.colorSeleccionadoUnico.trim() === '') {
        this.generalService.alert('Color requerido', 'Por favor, selecciona un color para el vehículo.', 'warning');
        return false;
      }
    }

    // Descripción
    if (!this.descripcion || this.descripcion.trim().length === 0) {
      this.generalService.alert('Descripción requerida', 'Por favor escribe una breve descripción del vehículo.', 'warning');
      return false;
    }
    if (this.descripcion.trim().length > 100) { // ← coherente con el mensaje
      this.generalService.alert('Descripción demasiado larga', 'La descripción debe tener máximo 100 caracteres.', 'warning');
      return false;
    }

    // Imágenes
    if (!this.imagenPrincipal) {
      this.generalService.alert('Falta imagen principal', 'Selecciona una imagen principal para continuar.', 'warning');
      return false;
    }
    if (this.estadoVehiculo !== 'Nuevo') {
      if (!Array.isArray(this.imagenesSecundarias) || this.imagenesSecundarias.length < 2) {
        this.generalService.alert('Imágenes secundarias insuficientes', 'Debes seleccionar al menos 2 imágenes secundarias.', 'warning');
        return false;
      }
      if (this.imagenesSecundarias.length > 10) {
        this.generalService.alert('Demasiadas imágenes', 'Puedes subir un máximo de 10 imágenes secundarias.', 'warning');
        return false;
      }
    }

    // Cilindrada (obligatoria)
    if (!this.cilindrada || this.cilindrada.trim().length === 0) {
      this.generalService.alert('Cilindrada requerida', 'Por favor ingresa la cilindrada (ej. 150cc).', 'warning');
      return false;
    }
    const valor = this.cilindrada.trim();
    if (valor.length > 25) {
      this.generalService.alert('Cilindrada demasiado larga', 'La cilindrada no puede tener más de 25 caracteres.', 'warning');
      return false;
    }
    const cilindradaValida = /^\d{1,4}\s?cc$/i.test(valor);
    if (!cilindradaValida) {
      this.generalService.alert('Cilindrada inválida', 'La cilindrada debe tener el formato correcto (Ej. 1000cc).', 'warning');
      return false;
    }
    this.cilindrada = valor.replace(/\s+/g, '').toLowerCase();

    // Transmisión (obligatoria)
    if (!this.transmision || this.transmision.trim().length === 0) {
      this.generalService.alert('Transmisión requerida', 'Por favor indica la transmisión (ej. Manual, Automática, CVT).', 'warning');
      return false;
    }
    const transmisionValor = this.transmision.trim();
    if (transmisionValor.length > 25) {
      this.generalService.alert('Transmisión demasiado larga', 'La transmisión no puede tener más de 25 caracteres.', 'warning');
      return false;
    }
    this.transmision = transmisionValor.replace(/\s+/g, ' ');

    // Campos opcionales con límite
    if (this.tipoMotor?.trim().length > 25) {
      this.generalService.alert('Tipo de Motor demasiado largo', 'El tipo de motor no puede tener más de 25 caracteres.', 'warning');
      return false;
    }
    if (this.combustible?.trim().length > 25) {
      this.generalService.alert('Combustible demasiado largo', 'El tipo de combustible no puede tener más de 25 caracteres.', 'warning');
      return false;
    }
    if (this.frenos?.trim().length > 25) {
      this.generalService.alert('Frenos demasiado largos', 'El tipo de frenos no puede tener más de 25 caracteres.', 'warning');
      return false;
    }
    if (this.suspension?.trim().length > 25) {
      this.generalService.alert('Suspensión demasiado larga', 'El tipo de suspensión no puede tener más de 25 caracteres.', 'warning');
      return false;
    }

    return true;
  }

  async prepararFormularioParaEnvioMoto(): Promise<FormData | false> {
    const formData = new FormData();

    formData.append('anio', this.anio.toString());
    formData.append('marca', this.marca);
    formData.append('modelo', this.modelo);
    formData.append('moneda', this.moneda);
    formData.append('placas', this.placas?.trim() ? this.placas.toUpperCase() : 'null');
    formData.append('descripcion', this.descripcion || '');
    formData.append('kilometraje', this.kilometraje?.toString() || '0');

    // Colores (si NO es nuevo, mover único al array)
    if (this.estadoVehiculo !== 'Nuevo') {
      this.colorSeleccionado = this.colorSeleccionadoUnico ? [this.colorSeleccionadoUnico] : [];
    }
    this.colorSeleccionado.forEach((color) => formData.append('color[]', color));

    formData.append('tipoVenta', this.estadoVehiculo);

    formData.append('tipoMotor', this.tipoMotor);
    formData.append('cilindrada', this.cilindrada);
    formData.append('transmision', this.transmision);
    formData.append('combustible', this.combustible);
    formData.append('frenos', this.frenos);
    formData.append('suspension', this.suspension);
    formData.append('precio', this.precio.toString());

    // Versión / precios (si usas catálogo para "Nuevo")
    if (this.estadoVehiculo_logico === 'nuevo') {
      const versionesSeleccionadas = this.versionSeleccionada
        .map((sel, i) => (sel ? this.versiones[i] : null))
        .filter(Boolean) as string[];

      if (versionesSeleccionadas.length > 0) {
        const versionesConPrecio = versionesSeleccionadas.map((v) => ({
          Name: v,
          Precio: this.preciosVersiones[v] || 0,
        }));
        formData.append('version', JSON.stringify(versionesConPrecio));
      }
    } else {
      // Usados/seminuevos: nombre de versión escrito + precio general
      if (this.versionSeleccionadaTexto?.trim()) {
        formData.append('version', JSON.stringify({
          Name: this.versionSeleccionadaTexto,
          Precio: this.precio,
        }));
      }
    }

    // Ubicación: particular o lote (igual que car.ts)
    let ubicacionObj: any = null;

    if (this.tipoSeleccionado === 'particular' && this.ubicacionSeleccionada) {
      ubicacionObj = {
        ciudad: this.ubicacionSeleccionada[0],
        estado: this.ubicacionSeleccionada[1],
        lat: this.ubicacionSeleccionada[2],
        lng: this.ubicacionSeleccionada[3],
      };
    }

    if (this.tipoSeleccionado === 'lote') {
      const lote = this.lotes.find(l => l._id === this.loteSeleccionado);
      const direccion = lote?.direccion.length > 1
        ? this.direccionSeleccionada
        : lote?.direccion[0];

      if (direccion) {
        ubicacionObj = {
          ciudad: direccion.ciudad,
          estado: direccion.estado,
          lat: direccion.lat,
          lng: direccion.lng,
        };
        formData.append('lote', lote._id);
      }
    }

    if (ubicacionObj) formData.append('ubicacion', JSON.stringify(ubicacionObj));

    if (this.imagenPrincipal) {
      formData.append('imagenPrincipal', this.imagenPrincipal);
      formData.append('imagenes', this.imagenPrincipal);
    }
    if (this.imagenesSecundarias.length > 0) {
      for (const f of this.imagenesSecundarias) formData.append('imagenes', f);
    }

    return formData;
  }

  // ====== Utilidades ======
  toggleColorSeleccionado(color: string): void {
    const index = this.colorSeleccionado.indexOf(color);
    if (index >= 0) this.colorSeleccionado.splice(index, 1);
    else this.colorSeleccionado.push(color);
  }

  quienLovende(num: number) {
    if (num == 0) {
      this.seccionFormulario = 2;
    } else if (num == 1) {
      this.seccionFormulario = 3;
      this.generarListaAnios();
    }
  }

  generarListaAnios() {
    const anioActual = new Date().getFullYear();
    for (let i = anioActual; i >= 1900; i--) this.listaAnios.push(i);
  }
}
