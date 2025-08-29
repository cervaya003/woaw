
import { Component, OnInit, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CamionesService } from '../../../services/camiones.service';
import { GeneralService } from '../../../services/general.service';
import { MapaComponent } from '../../modal/mapa/mapa.component';
import { FotosVeiculoComponent } from '../../modal/fotos-veiculo/fotos-veiculo.component';
import { Router } from '@angular/router';
import { RegistroService } from '../../../services/registro.service';
import { ContactosService } from './../../../services/contactos.service';
 

@Component({
  selector: 'app-camion',
 templateUrl: './camion.component.html',
  styleUrls: ['./camion.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CamionComponent implements OnInit {
  estadoVehiculo: 'Nuevo' | 'Usado' | 'Seminuevo' | '' = '';
  @Input() anio!: number;
  @Input() marca!: string;
  @Input() modelo!: string;
  @Input() tipo!: string; 


  // === Campos requeridos por el backend ===
  precio: number | null = null;
  color: string = '';
  kilometraje: number | null = null;

  tipoVenta: 'venta' | 'renta' | 'venta_renta' | '' = '';
  tipoCamion: string = '';

  // === Campos opcionales ===

  moneda: 'MXN' | 'USD' = 'MXN';
  ejes: number | null = null;
  capacidadCargaToneladas: number | null = null;
  transmision: string = '';
  combustible: string = '';
  potenciaHP: number | null = null;
  tipoCabina: string = '';
  descripcion: string = '';

  // === UI / flujo ===
  estadoCamion: 'Nuevo' | 'Usado' | 'Seminuevo' | '' = '';
  estadoCamion_logico: string = '';
  listaAnios: number[] = [];
  versiones: any[] = [];
  versionesDisponibles: boolean = false;
  versionSeleccionada: boolean[] = [];
  preciosVersiones: { [version: string]: number } = {};

  ubicacionSeleccionada: [string, string, number, number] | null = null; // [ciudad, estado, lat, lng]
  direccionCompleta: string = 'Obteniendo ubicación...';

  ubicacionSeleccionada: [string, string, number, number] | null = null; // [ciudad, estado, lat, lng]
  direccionCompleta: string = 'Obteniendo ubicación...';

  public Pregunta: 'no' | 'si' | null = null;
  tipoSeleccionado: 'particular' | 'lote' | 'empresa' = 'particular';

  // Lotes
  lotes: any[] = [];
  totalLotes: number = 0;
  ubicacionesLoteSeleccionado: any[] = [];
  ubicacionesLoteLegibles: string[] = [];
  loteSeleccionado: string | null = null;   // ObjectId
  direccionSeleccionada: any = null;        // objeto dirección si hay varias

  seccionFormulario: 1 | 2 | 3 = 1;

  // "Véndelo por nosotros"

  nombreCamion: string = '';
  anioCamion: number | null = null;
  precioEstimado: number | null = null;
  tipoFactura: string = '';

  // Para versiones seleccionadas
  versionSeleccionadaTexto: string = '';

  // Rol
  public MyRole: 'admin' | 'lotero' | 'transportista' | 'cliente' | null = null;

  // Catálogos estáticos
  colores = [
    { label: 'Blanco' }, { label: 'Negro' }, { label: 'Gris' }, { label: 'Plateado' },
    { label: 'Rojo' }, { label: 'Azul' }, { label: 'Azul marino' }, { label: 'Verde' },
    { label: 'Verde oscuro' }, { label: 'Beige' }, { label: 'Café' }, { label: 'Amarillo' },
    { label: 'Naranja' }, { label: 'Vino' }, { label: 'Oro' }, { label: 'Otro' },
  ];

  tiposCamion = [
    { label: 'Camión de carga', value: 'carga' },
    { label: 'Tractocamión', value: 'tractocamion' },
    { label: 'Camión cisterna', value: 'cisterna' },
    { label: 'Volquete', value: 'volquete' },
    { label: 'Camión plataforma', value: 'plataforma' },
    { label: 'Camión frigorífico', value: 'frigorifico' },
    { label: 'Camión grúa', value: 'grua' },
    { label: 'Camión de pasajeros', value: 'pasajeros' },
    { label: 'Otro', value: 'otro' }
  ];

  tiposCabina = [
    { label: 'Cabina simple', value: 'simple' },
    { label: 'Cabina extendida', value: 'extendida' },
    { label: 'Cabina doble', value: 'doble' },
    { label: 'Cabina dormitorio', value: 'dormitorio' },
    { label: 'Otro', value: 'otro' }
  ];

  tiposTransmision = [
    { label: 'Manual', value: 'manual' },
    { label: 'Automática', value: 'automatica' },
    { label: 'Semiautomática', value: 'semiautomatica' },
    { label: 'Otro', value: 'otro' }
  ];

  tiposCombustible = [
    { label: 'Diésel', value: 'diesel' },
    { label: 'Gasolina', value: 'gasolina' },
    { label: 'Gas natural', value: 'gas_natural' },
    { label: 'Eléctrico', value: 'electrico' },
    { label: 'Híbrido', value: 'hibrido' },
    { label: 'Otro', value: 'otro' }
  ];

  tiposVenta = [
    { label: 'Venta', value: 'venta' },
    { label: 'Renta', value: 'renta' },
    { label: 'Venta y Renta', value: 'venta_renta' }
  ];

  // Imágenes
  imagenesValidas: boolean = false;
  imagenPrincipal: File | null = null;
  imagenesSecundarias: File[] = [];
  imagenesIntentadas: boolean = false;

  constructor(
    private camionesService: CamionesService,
    private generalService: GeneralService,
    private modalController: ModalController,
    private router: Router,
    private registroService: RegistroService,
    public contactosService: ContactosService,
  ) {}

  async ngOnInit() {

    console.log('Modelo inicial:', this.modelo);

    // Determina rol y configura vista SIN parpadeos
    this.generalService.tipoRol$.subscribe((rol) => {
      if (rol === 'admin' || rol === 'lotero' || rol === 'transportista' || rol === 'cliente') {
        this.MyRole = rol;

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

        this.obtenerVersiones();
        this.generarListaAnios();
      } else {
        this.generalService.eliminarToken();
        this.generalService.alert('¡Saliste de tu sesión Error - 707!', '¡Hasta pronto!', 'info');
      }
    });

    // Log inicial
    console.log('CamionComponent iniciado con:', {
      anio: this.anio, marca: this.marca, modelo: this.modelo
    });
  }

  // ===== Años / Estado =====
  generarListaAnios() {
    const anioActual = new Date().getFullYear();
    for (let i = anioActual; i >= 1980; i--) this.listaAnios.push(i);
  }

  definirEstadoCamion() {
    const anioActual = new Date().getFullYear();

    if (this.anio === anioActual && this.MyRole === 'admin') {

      this.estadoCamion = 'Nuevo'; 
      this.estadoCamion_logico = 'nuevo';
      // Para camiones nuevos, SIEMPRE 0
      this.kilometraje = 0;
    } else if (this.anio === anioActual && this.MyRole !== 'admin') {
      this.estadoCamion = 'Seminuevo'; 
      this.estadoCamion_logico = 'seminuevo';
    } else if (this.anio >= anioActual - 5) {
      this.estadoCamion = 'Seminuevo'; 
      this.estadoCamion_logico = 'seminuevo';
    } else if (this.anio < 2005 && this.anio >= 1980) {
      this.estadoCamion = 'Usado'; 
      this.estadoCamion_logico = 'viejito';
    } else {
      this.estadoCamion = 'Usado'; 
      this.estadoCamion_logico = 'usado';
    }
    
    // También actualizamos el estado en la propiedad estadoVehiculo para mantener compatibilidad
    this.estadoVehiculo = this.estadoCamion;
    
    console.log(`Estado definido: ${this.estadoCamion}, KM: ${this.kilometraje}`);
  }

  obtenerVersiones() {
    if (this.modelo && this.anio && this.marca) {
      const anio = Number(this.anio);
      this.camionesService.GetVersiones(anio, this.marca, this.modelo).subscribe({
        next: (data: any) => {
          this.versiones = data || [];
          this.versionesDisponibles = Array.isArray(this.versiones) && this.versiones.length > 0;
          this.generalService.loadingDismiss();
          this.definirEstadoCamion();
        },
        error: (error: any) => {
          console.error('Error al obtener versiones:', error);
          this.generalService.loadingDismiss();
          this.definirEstadoCamion();
          this.versiones = [];
        },
      });
    }
  }
  
  // Agregar método para selección de versión desde Car Component
  onSeleccionVersion(version: string) {
    this.versionSeleccionadaTexto = version;
    console.log('Versión seleccionada:', version);
  }
  
  // Adaptar toggle version desde Car Component
  toggleVersion(index: number, version: string): void {
    this.versionSeleccionada[index] = !this.versionSeleccionada[index];

    if (!this.versionSeleccionada[index]) {
      delete this.preciosVersiones[version];
    }
  }


  // ===== Flujo Pantallas =====
  seleccionarTipo(tipo: 'particular' | 'lote' | 'empresa') {
    this.tipoSeleccionado = tipo;
  }

  continuar() {
    if (!this.tipoSeleccionado) return;
    if (this.tipoSeleccionado === 'lote') this.getLotes('all');
    this.Pregunta = 'no';
  }

  quienLovende(num: number) {
    if (num === 0) {
      this.seccionFormulario = 2;
    } else {
      this.seccionFormulario = 3;
      this.generarListaAnios();
    }
  }

  cambiarEstado(nuevoEstado: 'Nuevo' | 'Seminuevo') {
    this.estadoCamion = nuevoEstado;

    this.estadoVehiculo = nuevoEstado;
    
    if (nuevoEstado === 'Nuevo') {
      this.estadoCamion_logico = 'nuevo';
      // Para camiones nuevos, siempre km=0
      this.kilometraje = 0;
    } else {
      this.estadoCamion_logico = 'seminuevo';
    }

  }

  // ===== Ubicación =====
  async seleccionarUbicacion() {

    const modal = await this.modalController.create({
      component: MapaComponent,
      backdropDismiss: false, // ⛔️ no se puede cerrar tocando fuera
    });
    await modal.present();

    const { data, role } = await modal.onDidDismiss();

    // Si cancelan o no llega payload, no marcamos ubicación
    if (!data || role === 'cancel') {
      this.ubicacionSeleccionada = null;
      this.direccionCompleta = 'Selecciona la ubicación en el mapa.';
      this.generalService.alert('Ubicación requerida', 'Debes seleccionar la ubicación para continuar.', 'warning');
      return;
    }

    // Normaliza: puede venir como arreglo [ciudad, estado, lat, lng] o como objeto
    let ciudad: string | undefined;
    let estado: string | undefined;
    let lat: number | undefined;
    let lng: number | undefined;

    if (Array.isArray(data)) {
      [ciudad, estado, lat, lng] = data as any[];
    } else {
      ciudad = (data as any).ciudad ?? (data as any).city;
      estado = (data as any).estado ?? (data as any).state;
      lat = (data as any).lat ?? (data as any).latitude;
      lng = (data as any).lng ?? (data as any).longitude;
    }

    // Valida que al menos tengamos coordenadas numéricas
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      this.ubicacionSeleccionada = null;
      this.direccionCompleta = 'Selecciona la ubicación en el mapa.';
      this.generalService.alert('Ubicación inválida', 'Vuelve a seleccionar la ubicación.', 'warning');
      return;
    }

    // Guarda y resuelve dirección legible
    this.ubicacionSeleccionada = [ciudad || '', estado || '', lat, lng];

    try {
      this.direccionCompleta = await this.generalService.obtenerDireccionDesdeCoordenadas(lat, lng);
    } catch {
      this.direccionCompleta = 'No se pudo obtener la dirección.';
    }
  }

  // ===== Validación de ubicación (igual que en el original) =====

  private validarUbicacion(): boolean {
    const esParticular = this.tipoSeleccionado === 'particular';
    const esLoteEmpresa = this.tipoSeleccionado === 'lote' || this.tipoSeleccionado === 'empresa';

    if (esParticular) {
      const valida =
        this.ubicacionSeleccionada &&
        this.ubicacionSeleccionada.length === 4 &&
        typeof this.ubicacionSeleccionada[2] === 'number' &&
        typeof this.ubicacionSeleccionada[3] === 'number';

      if (!valida) {
        this.generalService.alert('Ubicación requerida', 'Selecciona la ubicación del camión en el mapa.', 'warning');
        return false;

      }
      return true;
    }

    if (esLoteEmpresa) {
      const lote = this.lotes.find(l => l._id === this.loteSeleccionado);
      if (!lote) {
        this.generalService.alert('Lote requerido', 'Selecciona un lote o empresa válido.', 'warning');
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

  // ===== Lotes =====
  getLotes(tipo: 'all' | 'mios') {
    this.registroService.allLotes(tipo).subscribe({
      next: async (res) => {
        this.lotes = res.lotes || [];
        this.totalLotes = this.lotes.length;

        if (this.lotes.length === 1) {
          const loteUnico = this.lotes[0];
          this.loteSeleccionado = loteUnico._id;
          this.ubicacionesLoteSeleccionado = loteUnico.direccion;
          this.leerLatLng();
        }
      },
      error: async (error) => {
        console.error('Error al obtener lotes:', error);
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
      this.generalService
        .obtenerDireccionDesdeCoordenadas(this.direccionSeleccionada.lat, this.direccionSeleccionada.lng)
        .then((direccion) => (this.direccionCompleta = direccion))
        .catch(() => (this.direccionCompleta = 'No se pudo obtener la dirección.'));
    } else {
      this.direccionSeleccionada = null;
      this.ubicacionesLoteLegibles = [];
      const promesas = this.ubicacionesLoteSeleccionado.map((dir) =>
        this.generalService.obtenerDireccionDesdeCoordenadas(dir.lat, dir.lng)
      );
      Promise.all(promesas)
        .then((direcciones) => (this.ubicacionesLoteLegibles = direcciones))
        .catch(() => (this.ubicacionesLoteLegibles = this.ubicacionesLoteSeleccionado.map(() => 'No disponible')));
    }
  }


  // ===== Imágenes =====
  async seleccionarImagenes() {
    const modal = await this.modalController.create({
      component: FotosVeiculoComponent,
      backdropDismiss: false,

      componentProps: { estadoVehiculo: this.estadoCamion },

    });
    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data) {
      this.imagenesIntentadas = true;
      this.imagenPrincipal = data.imagenPrincipal;
      this.imagenesSecundarias = data.imagenesSecundarias || [];


      // Validar según el estado del camión
      if (this.estadoCamion === 'Nuevo') {
        if (!this.imagenPrincipal) {
          this.generalService.alert(
            'Falta imagen principal',
            'Selecciona una imagen principal para continuar.',
            'warning'
          );
          this.imagenesValidas = false;
          return false;
        }
        this.imagenesValidas = true;
      } else if (this.estadoCamion === 'Seminuevo' || this.estadoCamion === 'Usado') {
        if (!this.imagenPrincipal) {
          this.generalService.alert(
            'Falta imagen principal',
            'Selecciona una imagen principal para continuar.',
            'warning'
          );
          this.imagenesValidas = false;
          return false;
        }


      if (this.estadoCamion === 'Seminuevo' || this.estadoCamion === 'Usado') {
        if (this.imagenesSecundarias.length < 2) {
          this.generalService.alert(
            'Imágenes insuficientes',
            'Debes seleccionar al menos 2 imágenes secundarias para camiones usados o seminuevos.',
            'warning'
          );

          this.imagenesValidas = false;
          return false;
        }
      }
      
      return this.imagenesValidas;

    } else {
      this.imagenesValidas = false;
      return false;
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

  // Validaciones de campos específicos
  validarEjes(): boolean {
    // Si no se ingresó ningún valor (es null), se considera válido porque es opcional
    if (this.ejes === null) {
      return true;
    }

    // Verificar que sea un número y esté dentro del rango permitido (2-10)
    if (!Number.isInteger(this.ejes) || this.ejes < 2 || this.ejes > 10) {
      this.generalService.alert(
        'Número de ejes inválido',
        'El número de ejes debe ser un número entero entre 2 y 10.',
        'warning'
      );
      return false;
    }

    return true;
  }

  validarCapacidadCarga(): boolean {
    // Si no se ingresó ningún valor (es null), se considera válido porque es opcional
    if (this.capacidadCargaToneladas === null) {
      return true;

    }

    // Los valores del select son los permitidos, pero si se manipula el valor manualmente,
    // verificamos que esté dentro de un rango aceptable
    if (isNaN(Number(this.capacidadCargaToneladas)) || 
        this.capacidadCargaToneladas < 0.5 || 
        this.capacidadCargaToneladas > 150) {
      this.generalService.alert(
        'Capacidad de carga inválida',
        'Por favor, selecciona una capacidad de carga válida.',
        'warning'
      );
      return false;
    }

    return true;
  }

 validarDescripcion(): boolean {
  // La descripción siempre es obligatoria, sin importar el tipo de camión
  if (!this.descripcion || this.descripcion.trim() === '') {
    this.generalService.alert(
      'Descripción requerida',
      'Por favor escribe una descripción del camión.',
      'warning'
    );
    return false;
  }
   
  
  // Para usados/seminuevos es obligatoria, pero no hay restricciones de longitud
  if (!this.descripcion || this.descripcion.trim() === '') {
    this.generalService.alert(
      'Descripción requerida',
      'Por favor escribe una descripción del camión.',
      'warning'
    );
    return false;
  }
  
  
  // Para usados/seminuevos es obligatoria, pero no hay restricciones de longitud
  if (!this.descripcion || this.descripcion.trim() === '') {
    this.generalService.alert(
      'Descripción requerida',
      'Por favor escribe una descripción del camión.',
      'warning'
    );
    return false;
  }
    
    return true;
  }

  // ===== ENVÍO DEL FORMULARIO =====
  async EnviarCamion() {
    let validado: boolean = false;
    let appdata: FormData | false = false;
    
    // Asegurar que si es nuevo, kilometraje es 0
    if (this.estadoCamion === 'Nuevo' || this.estadoCamion_logico === 'nuevo') {
      this.kilometraje = 0;
    }
    
    if (this.estadoCamion === 'Nuevo' || this.estadoCamion_logico === 'nuevo') {
      validado = await this.validacionesAntesdeEnviarForm_Nuevos();
      if (validado) {
        appdata = await this.prepararFormularioParaEnvio_Nuevo();
      }
    } else {
      validado = await this.validacionesAntesdeEnviarForm_Usados();
      if (validado) {
        appdata = await this.prepararFormularioParaEnvio_Usado();
      }
    }
    
    if (!validado || !appdata) {
      this.generalService.loadingDismiss();
      return;
    }

    this.generalService.confirmarAccion(
      '¿Estás seguro de que deseas enviar esta información?',
      'Confirmar envío',
      async () => {
        await this.enviarDatos(appdata);
      },

      'Al continuar, confirmas que los datos proporcionados sobre tu camión son correctos y serán publicados.'
    );
  }


  // ===== VALIDACIONES PARA CAMIONES NUEVOS =====
  async validacionesAntesdeEnviarForm_Nuevos(): Promise<boolean> {
    // Validar ubicación (igual que en CarComponent)
    if (!this.validarUbicacion()) {
      return false;
    }

    // Validar tipo de camión
    if (!this.tipoCamion) {
      this.generalService.alert(
        'Tipo de camión requerido',
        'Debes seleccionar el tipo de camión.',
        'warning'
      );
      return false;
    }

    // Validar color
    if (!this.color) {
      this.generalService.alert(
        'Color requerido',
        'Por favor, selecciona un color para el camión.',
        'warning'
      );
      return false;
    }

    // Validar precio
    if (!this.precio || isNaN(Number(this.precio)) || Number(this.precio) <= 0) {
      this.generalService.alert(
        'Precio requerido',
        'Debes ingresar un precio válido.',
        'warning'
      );
      return false;
    }

    // Rango de precios para camiones nuevos (mayor que autos)
    if (this.precio < 50000 || this.precio > 10000000) {
      this.generalService.alert(
        'Precio inválido',
        'El precio debe estar entre $50,000 y $10,000,000.',
        'warning'
      );
      return false;
    }
    
    // Validar tipo de venta
    if (!this.tipoVenta) {
      this.generalService.alert(
        'Tipo de oferta requerido',
        'Debes seleccionar si el camión es para venta, renta o ambos.',
        'warning'
      );
      return false;
    }

    // Validar ejes si se proporcionó un valor
    if (!this.validarEjes()) {
      return false;
    }
    
    // Validar capacidad de carga si se proporcionó un valor
    if (!this.validarCapacidadCarga()) {
      return false;
    }

    // Validar imágenes
    if (!this.imagenPrincipal) {
      this.generalService.alert(
        'Falta imagen principal',
        'Selecciona una imagen principal para continuar.',
        'warning'
      );
      return false;
    }

    if (!this.validarDescripcion()) {
  return false;
}

    // Para camiones nuevos, el kilometraje siempre es 0
    this.kilometraje = 0;

    return true;
  }

  // ===== VALIDACIONES PARA CAMIONES USADOS/SEMINUEVOS =====
  async validacionesAntesdeEnviarForm_Usados(): Promise<boolean> {
    // Validar ubicación
    if (!this.validarUbicacion()) {
      return false;
    }

    // Validar tipo de camión
    if (!this.tipoCamion) {
      this.generalService.alert(
        'Tipo de camión requerido',
        'Debes seleccionar el tipo de camión.',
        'warning'
      );
      return false;
    }

    // Validar precio
    if (!this.precio || isNaN(Number(this.precio)) || Number(this.precio) <= 0) {
      this.generalService.alert(
        'Precio requerido',
        'Debes ingresar un precio válido.',
        'warning'
      );
      return false;
    }

    // Rango de precios para camiones usados/seminuevos
    if (this.precio < 30000 || this.precio > 10000000) {
      this.generalService.alert(
        'Precio inválido',
        'El precio debe estar entre $30,000 y $10,000,000.',
        'warning'
      );
      return false;
    }

    // Validar color
    if (!this.color) {
      this.generalService.alert(
        'Color requerido',
        'Por favor, selecciona un color para el camión.',
        'warning'
      );
      return false;
    }

    // Validar kilometraje - Pieza clave en la validación
    if (this.kilometraje === null || this.kilometraje === undefined || isNaN(Number(this.kilometraje))) {
      this.generalService.alert(
        'Kilometraje requerido',
        'Debes ingresar un kilometraje válido para el camión usado o seminuevo.',
        'warning'
      );
      return false;
    }

    // Rangos de kilometraje según tipo de camión
    if (this.estadoCamion === 'Seminuevo' && this.kilometraje > 120000) {
      this.generalService.alert(
        'Kilometraje elevado para seminuevo',
        'Para un camión seminuevo, el kilometraje no debería superar los 120,000 km.',
        'warning'
      );
      // Decisión: seguir o no según reglas de negocio
      return false;
    }

    if (this.estadoCamion === 'Usado' && this.kilometraje > 1200000) {
      this.generalService.alert(
        'Kilometraje muy elevado',
        'Este camión tiene más de 1,200,000 km. Puede ser difícil de vender o requerir mantenimiento importante.',
        'warning'
      );
      // Solo alertamos pero dejamos continuar
    }

    // Validar tipo de venta
    if (!this.tipoVenta) {
      this.generalService.alert(
        'Tipo de oferta requerido',
        'Debes seleccionar si el camión es para venta, renta o ambos.',
        'warning'
      );
      return false;
    }

    // Validar ejes
    if (!this.validarEjes()) {
      return false;
    }
    
    // Validar capacidad de carga
    if (!this.validarCapacidadCarga()) {
      return false;
    }

    // Validar descripción para usados/seminuevos (obligatorio)
  if (!this.validarDescripcion()) {
  return false;
}

    // Validar imágenes

    if (!this.imagenPrincipal) {
      this.generalService.alert(
        'Falta imagen principal',
        'Selecciona una imagen principal para continuar.',
        'warning'
      );
      return false;
    }

    if (!Array.isArray(this.imagenesSecundarias) || this.imagenesSecundarias.length < 2) {
      this.generalService.alert(
        'Imágenes secundarias insuficientes',
        'Para camiones usados o seminuevos, debes seleccionar al menos 2 imágenes secundarias.',
        'warning'
      );
      return false;
    }

    if (this.imagenesSecundarias.length > 10) {
      this.generalService.alert(
        'Demasiadas imágenes',
        'Puedes subir un máximo de 10 imágenes secundarias.',
        'warning'
      );
      return false;
    }

    return true;
  }

  // ===== PREPARACIÓN DEL FORMULARIO =====
  async prepararFormularioParaEnvio_Nuevo(): Promise<FormData | false> {
    const formData = new FormData();
    
    // Datos básicos
    formData.append('anio', this.anio.toString());
    formData.append('marca', this.marca);
    formData.append('modelo', this.modelo);
    formData.append('tipoCamion', this.tipoCamion);
    formData.append('color', this.color);
    formData.append('precio', String(this.precio));
    formData.append('moneda', this.moneda);
    formData.append('tipoVenta', this.tipoVenta);
    
    // Para camiones nuevos, siempre es 0
    formData.append('kilometraje', '0');
    
    // Campos opcionales
    if (this.ejes != null) formData.append('ejes', String(this.ejes));
    if (this.capacidadCargaToneladas != null) formData.append('capacidadCargaToneladas', String(this.capacidadCargaToneladas));
    if (this.transmision) formData.append('transmision', this.transmision);
    if (this.combustible) formData.append('combustible', this.combustible);
    if (this.potenciaHP != null) formData.append('potenciaHP', String(this.potenciaHP));
    if (this.tipoCabina) formData.append('tipoCabina', this.tipoCabina);

    if (this.descripcion && this.descripcion.trim()) formData.append('descripcion', this.descripcion.trim());

    // Ubicación

    if (this.ubicacionSeleccionada) {
      const ubicacionObj = {
        ciudad: this.ubicacionSeleccionada[0],
        estado: this.ubicacionSeleccionada[1],
        lat: this.ubicacionSeleccionada[2],
        lng: this.ubicacionSeleccionada[3],
      };
      formData.append('ubicacion', JSON.stringify(ubicacionObj));
    } else if (this.tipoSeleccionado === 'lote' || this.tipoSeleccionado === 'empresa') {
      // Toma dirección del lote
      const lote = this.lotes.find(l => l._id === this.loteSeleccionado);
      const direccion = lote?.direccion.length > 1 ? this.direccionSeleccionada : lote?.direccion[0];

      if (direccion) {
        const ubicacionObj = {
          ciudad: direccion.ciudad,
          estado: direccion.estado,
          lat: direccion.lat,
          lng: direccion.lng,
        };
        formData.append('ubicacion', JSON.stringify(ubicacionObj));
        formData.append('lote', lote!._id);
      }
    }

    // Imágenes
    if (this.imagenPrincipal) {
      formData.append('imagenPrincipal', this.imagenPrincipal);
      formData.append('imagenes', this.imagenPrincipal);
    }

    if (this.imagenesSecundarias && this.imagenesSecundarias.length > 0) {
      for (const file of this.imagenesSecundarias) {
        formData.append('imagenes', file);
      }
    }

    return formData;
  }

  async prepararFormularioParaEnvio_Usado(): Promise<FormData | false> {
    const formData = new FormData();
    
    // Datos básicos
    formData.append('anio', this.anio.toString());
    formData.append('marca', this.marca);
    formData.append('modelo', this.modelo);
    formData.append('tipoCamion', this.tipoCamion);
    formData.append('color', this.color);
    formData.append('precio', String(this.precio));
    formData.append('moneda', this.moneda);
    formData.append('tipoVenta', this.tipoVenta);
    
    // Kilometraje para usados/seminuevos
    formData.append('kilometraje', String(this.kilometraje || 0));
    
    // Campos opcionales
    if (this.ejes != null) formData.append('ejes', String(this.ejes));
    if (this.capacidadCargaToneladas != null) formData.append('capacidadCargaToneladas', String(this.capacidadCargaToneladas));
    if (this.transmision) formData.append('transmision', this.transmision);
    if (this.combustible) formData.append('combustible', this.combustible);
    if (this.potenciaHP != null) formData.append('potenciaHP', String(this.potenciaHP));
    if (this.tipoCabina) formData.append('tipoCabina', this.tipoCabina);
    
    // Para camiones usados, la descripción es obligatoria
    if (this.descripcion) formData.append('descripcion', this.descripcion.trim());

    // Ubicación
    if (this.ubicacionSeleccionada) {
      const ubicacionObj = {
        ciudad: this.ubicacionSeleccionada[0],
        estado: this.ubicacionSeleccionada[1],
        lat: this.ubicacionSeleccionada[2],
        lng: this.ubicacionSeleccionada[3],
      };
      formData.append('ubicacion', JSON.stringify(ubicacionObj));
    } else if (this.tipoSeleccionado === 'lote' || this.tipoSeleccionado === 'empresa') {
      const lote = this.lotes.find(l => l._id === this.loteSeleccionado);
      const direccion = lote?.direccion.length > 1 ? this.direccionSeleccionada : lote?.direccion[0];
      if (direccion) {
        const ubicacionObj = {
          ciudad: direccion.ciudad,
          estado: direccion.estado,
          lat: direccion.lat,
          lng: direccion.lng,
        };
        formData.append('ubicacion', JSON.stringify(ubicacionObj));
        formData.append('lote', lote!._id);
      }
    }

    // Imágenes
    if (this.imagenPrincipal) {
      formData.append('imagenPrincipal', this.imagenPrincipal);
      formData.append('imagenes', this.imagenPrincipal);
    }

    if (this.imagenesSecundarias && this.imagenesSecundarias.length > 0) {
      for (const file of this.imagenesSecundarias) {
        formData.append('imagenes', file);
      }
    }

    return formData;
  }

  async enviarDatos(appdata: FormData) {
    this.generalService.loading('Guardando camión...');
    
    this.camionesService.guardarCamion(appdata).subscribe({
      next: (res: any) => {
        // El back puede regresar token/rol si hubo actualización de rol
        if (res.token && res.rol) {
          const userActual = JSON.parse(localStorage.getItem('user') || '{}');
          userActual.rol = res.rol;
          localStorage.setItem('user', JSON.stringify(userActual));
          localStorage.setItem('token', res.token);
        }
        this.router.navigate(['/mis-camiones']);
        this.generalService.loadingDismiss();
        this.generalService.alert('¡Camión agregado correctamente!', 'El camión fue agregado correctamente.', 'success');
      },
      error: (err: any) => {
        this.generalService.loadingDismiss();
        console.error('Error al guardar camión:', err);
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('¡Algo salió mal!', mensaje, 'danger');
      },
      complete: () => this.generalService.loadingDismiss(),
    });
  }
}

