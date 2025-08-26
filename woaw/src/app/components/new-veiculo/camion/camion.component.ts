import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CamionesService } from '../../../services/camiones.service';
import { GeneralService } from '../../../services/general.service';
import { MapaComponent } from '../../modal/mapa/mapa.component';
import { FotosCamionComponent } from '../../modal/fotos-camion/fotos-camion.component';
import { Router, NavigationStart } from '@angular/router';
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
  @Input() anio!: number;
  @Input() marca!: string;
  @Input() modelo!: string;
  
  // Campos obligatorios según el backend
  precio: number | null = null;
  color: string = '';
  kilometraje: number | null = null;
  tipoVenta: string = 'venta'; // Valores posibles: 'venta', 'renta', 'venta_renta'
  tipoCamion: string = '';
  
  // Campos opcionales según el backend
  moneda: 'MXN' | 'USD' = 'MXN';
  ejes: number | null = null;
  capacidadCargaToneladas: number | null = null;
  transmision: string = '';
  combustible: string = '';
  potenciaHP: number | null = null;
  tipoCabina: string = '';
  descripcion: string = '';
  
  // Propiedades para UI
  estadoCamion: 'Nuevo' | 'Usado' | 'Seminuevo' | '' = '';
  estadoCamion_logico: string = '';
  listaAnios: number[] = [];
  lotes: any[] = [];
  totalLotes: number = 0;
  direccionCompleta: string = 'Obteniendo ubicación...';
  
  versiones: any[] = [];
  ubicacionSeleccionada: [string, string, number, number] | null = null;
  esUsadoAntiguo: boolean = false;
  imagenesIntentadas: boolean = false;
  versionesDisponibles: boolean = false;

  public Pregunta: 'no' | 'si' | null = null;
  tipoSeleccionado: 'particular' | 'lote' | 'empresa' = 'particular';

  ubicacionesLoteLegibles: string[] = [];

  loteSeleccionado: string | null = null;
  direccionSeleccionada: any = null;
  ubicacionesLoteSeleccionado: any[] = [];
  seccionFormulario: 1 | 2 | 3 = 1;

  nombreCamion: string = '';
  anioCamion: number | null = null;
  precioEstimado: number | null = null;
  tipoFactura: string = '';

  // -----
  public MyRole: 'admin' | 'lotero' | 'transportista' | 'empresa' | 'cliente' | null = null;
  
  // Opciones para campos de selección
  colores = [
    { label: 'Blanco' },
    { label: 'Negro' },
    { label: 'Gris' },
    { label: 'Plateado' },
    { label: 'Rojo' },
    { label: 'Azul' },
    { label: 'Azul marino' },
    { label: 'Verde' },
    { label: 'Verde oscuro' },
    { label: 'Beige' },
    { label: 'Café' },
    { label: 'Amarillo' },
    { label: 'Naranja' },
    { label: 'Vino' },
    { label: 'Oro' },
    { label: 'Otro' },
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

  imagenesValidas: boolean = false;
  imagenPrincipal: File | null = null;
  imagenesSecundarias: File[] = [];

  constructor(
    private fb: FormBuilder,
    private camionesService: CamionesService,
    private generalService: GeneralService,
    private modalController: ModalController,
    private router: Router,
    private registroService: RegistroService,
    public contactosService: ContactosService,
  ) { }

  async ngOnInit() {
    this.generalService.tipoRol$.subscribe((rol) => {
      if (rol === 'admin' || rol === 'lotero' || rol === 'transportista' || rol === 'empresa' || rol === 'cliente') {
        this.MyRole = rol;
      } else {
        this.generalService.eliminarToken();
        this.generalService.alert(
          '¡Saliste de tu sesión Error - 707!',
          '¡Hasta pronto!',
          'info'
        );
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
    } else if (this.MyRole === 'empresa') {
      this.Pregunta = 'no';
      this.seccionFormulario = 2;
      this.tipoSeleccionado = 'empresa';
    } else {
      this.Pregunta = 'no';
      this.seccionFormulario = 1;
      this.tipoSeleccionado = 'particular';
    }
    
    this.obtenerVersiones();
    this.generarListaAnios();
  }
  
  seleccionarTipo(tipo: 'particular' | 'lote' | 'empresa') {
    this.tipoSeleccionado = tipo;
  }
  
  generarListaAnios() {
    const anioActual = new Date().getFullYear();
    for (let i = anioActual; i >= 1980; i--) {
      this.listaAnios.push(i);
    }
  }
  
  continuar() {
    if (!this.tipoSeleccionado) return;
    if (this.tipoSeleccionado == 'lote') {
      this.getLotes('all');
    }
    this.Pregunta = 'no';
  }
  
  definirEstadoCamion() {
    const anioActual = new Date().getFullYear();

    if (this.anio === anioActual && this.MyRole == 'admin') {
      this.estadoCamion = 'Nuevo';
      this.estadoCamion_logico = 'nuevo';
    } else if (this.anio === anioActual && this.MyRole != 'admin') {
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

    this.esUsadoAntiguo =
      this.estadoCamion === 'Usado' && this.anio < 2005 && this.anio >= 1980;
  }
  
  obtenerVersiones() {
    if (this.modelo && this.anio && this.marca) {
      const anio = Number(this.anio);

      this.camionesService.GetVersiones(anio, this.marca, this.modelo).subscribe({
        next: (data) => {
          this.versiones = data || [];
          this.versionesDisponibles =
            Array.isArray(this.versiones) && this.versiones.length > 0;
          this.generalService.loadingDismiss();
          this.definirEstadoCamion();
        },
        error: (error) => {
          console.error('Error al obtener versiones:', error);
          this.generalService.loadingDismiss();
          this.definirEstadoCamion();
          this.versiones = [];
        },
      });
    }
  }
  
  async seleccionarUbicacion() {
    const modal = await this.modalController.create({
      component: MapaComponent,
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data) {
      this.ubicacionSeleccionada = data;
      if (this.ubicacionSeleccionada) {
        this.generalService.obtenerDireccionDesdeCoordenadas(this.ubicacionSeleccionada[2], this.ubicacionSeleccionada[3])
          .then((direccion) => {
            this.direccionCompleta = direccion;
          })
          .catch((error) => {
            this.direccionCompleta = 'No se pudo obtener la dirección.';
            console.warn(error);
          });
      }
    }
  }
  
  async seleccionarImagenes() {
    const modal = await this.modalController.create({
      component: FotosCamionComponent,
      backdropDismiss: false,
      componentProps: {
        estadoCamion: this.estadoCamion,
      },
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data) {
      this.imagenesIntentadas = true;
      this.imagenPrincipal = data.imagenPrincipal;
      this.imagenesSecundarias = data.imagenesSecundarias;

      // 🔍 Validación por tipo de camión
      if (this.estadoCamion === 'Nuevo') {
        if (!this.imagenPrincipal) {
          this.generalService.alert(
            'Falta imagen principal',
            'Selecciona una imagen principal para continuar.',
            'warning'
          );
          this.imagenesValidas = false;
          return;
        }
        this.imagenesValidas = true;
      }

      if (
        this.estadoCamion === 'Seminuevo' ||
        this.estadoCamion === 'Usado'
      ) {
        if (!this.imagenPrincipal) {
          this.generalService.alert(
            'Falta imagen principal',
            'Selecciona una imagen principal para continuar.',
            'warning'
          );
          this.imagenesValidas = false;
          return;
        }

        if (this.imagenesSecundarias.length < 2) {
          this.generalService.alert(
            'Imágenes insuficientes',
            'Debes seleccionar al menos 2 imágenes secundarias.',
            'warning'
          );
          this.imagenesValidas = false;
          return;
        }

        this.imagenesValidas = true;
      }
    } else {
      console.log('⛔ Modal cancelado o sin imágenes.');
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

  // # ----- -----
  // ENVIO DEL FORM ✅✅
  // # ----- -----

  async EnviarCamion() {
    if (!await this.validarFormulario()) {
      this.generalService.loadingDismiss();
      return;
    }

    const formData = await this.prepararFormulario();
    if (!formData) {
      this.generalService.loadingDismiss();
      return;
    }

    this.generalService.confirmarAccion(
      '¿Estás seguro de que deseas enviar esta información?',
      'Confirmar envío',
      async () => {
        await this.enviarDatos(formData);
      },
      'Al continuar, confirmas que los datos proporcionados sobre tu camión son correctos y estás consciente de que serán publicados.'
    );
  }
  
  async enviarDatos(formData: FormData) {
    // Enviar a backend
    this.generalService.loading('Guardando camión...');
    this.camionesService.guardarCamion(formData).subscribe({
      next: (res: any) => {
        if (res.token && res.rol) {
          const userActual = JSON.parse(localStorage.getItem('user') || '{}');
          userActual.rol = res.rol;
          localStorage.setItem('user', JSON.stringify(userActual));
          localStorage.setItem('token', res.token);
        }
        this.router.navigate(['/mis-camiones']);
        this.generalService.loadingDismiss();
        this.generalService.alert(
          '¡Camión agregado correctamente!',
          'El camión fue agregado correctamente.',
          'success'
        );
      },
      error: (err) => {
        this.generalService.loadingDismiss();
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert(
          '¡Algo salió mal!',
          mensaje,
          'danger'
        );
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }
  
  async validarFormulario(): Promise<boolean> {
    // Validar campos requeridos según el backend
    if (!this.marca) {
      this.generalService.alert('Campo requerido', 'Debes seleccionar una marca.', 'warning');
      return false;
    }
    
    if (!this.modelo) {
      this.generalService.alert('Campo requerido', 'Debes seleccionar un modelo.', 'warning');
      return false;
    }
    
    if (!this.anio) {
      this.generalService.alert('Campo requerido', 'Debes seleccionar un año.', 'warning');
      return false;
    }
    
    if (!this.precio || this.precio <= 0) {
      this.generalService.alert('Campo requerido', 'Debes ingresar un precio válido.', 'warning');
      return false;
    }
    
    if (!this.color) {
      this.generalService.alert('Campo requerido', 'Debes seleccionar un color.', 'warning');
      return false;
    }
    
    if (!this.kilometraje && this.kilometraje !== 0) {
      this.generalService.alert('Campo requerido', 'Debes ingresar el kilometraje.', 'warning');
      return false;
    }
    
    if (!this.tipoVenta) {
      this.generalService.alert('Campo requerido', 'Debes seleccionar el tipo de venta.', 'warning');
      return false;
    }
    
    if (!this.tipoCamion) {
      this.generalService.alert('Campo requerido', 'Debes seleccionar el tipo de camión.', 'warning');
      return false;
    }
    
    // Validar ubicación
    if (!this.validarUbicacion()) {
      return false;
    }
    
    // Validar imágenes
    if (!this.imagenPrincipal) {
      this.generalService.alert('Imagen principal requerida', 'Debes seleccionar una imagen principal.', 'warning');
      return false;
    }
    
    return true;
  }
  
  async prepararFormulario(): Promise<FormData | null> {
    const formData = new FormData();
    
    // Campos requeridos por el backend
    formData.append('marca', this.marca);
    formData.append('modelo', this.modelo);
    formData.append('anio', this.anio.toString());
    formData.append('precio', this.precio?.toString() || '0');
    formData.append('color', this.color);
    formData.append('kilometraje', this.kilometraje?.toString() || '0');
    formData.append('tipoVenta', this.tipoVenta);
    formData.append('tipoCamion', this.tipoCamion);
    
    // Campos opcionales
    if (this.moneda) formData.append('moneda', this.moneda);
    if (this.ejes) formData.append('ejes', this.ejes.toString());
    if (this.capacidadCargaToneladas) formData.append('capacidadCargaToneladas', this.capacidadCargaToneladas.toString());
    if (this.transmision) formData.append('transmision', this.transmision);
    if (this.combustible) formData.append('combustible', this.combustible);
    if (this.potenciaHP) formData.append('potenciaHP', this.potenciaHP.toString());
    if (this.tipoCabina) formData.append('tipoCabina', this.tipoCabina);
    if (this.descripcion) formData.append('descripcion', this.descripcion);
    
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
      const direccion = lote?.direccion.length > 1
        ? this.direccionSeleccionada
        : lote?.direccion[0];

      if (direccion) {
        const ubicacionObj = {
          ciudad: direccion.ciudad,
          estado: direccion.estado,
          lat: direccion.lat,
          lng: direccion.lng,
        };
        formData.append('ubicacion', JSON.stringify(ubicacionObj));
      }
    }
    
    // Lote (si aplica)
    if ((this.tipoSeleccionado === 'lote' || this.tipoSeleccionado === 'empresa') && this.loteSeleccionado) {
      formData.append('lote', this.loteSeleccionado);
    }
    
    // Imágenes
    if (this.imagenPrincipal) {
      formData.append('imagenPrincipal', this.imagenPrincipal);
    }

    if (this.imagenesSecundarias.length > 0) {
      for (const file of this.imagenesSecundarias) {
        formData.append('imagenes', file);
      }
    }
    
    return formData;
  }
  
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
        this.generalService.alert(
          'Ubicación requerida',
          'Selecciona la ubicación del camión en el mapa.',
          'warning'
        );
        return false;
      }

      return true;
    }

    if (esLoteEmpresa) {
      const lote = this.lotes.find(l => l._id === this.loteSeleccionado);
      if (!lote) {
        this.generalService.alert(
          'Lote requerido',
          'Selecciona un lote o empresa válido.',
          'warning'
        );
        return false;
      }

      if (lote.direccion.length > 1 && !this.direccionSeleccionada) {
        this.generalService.alert(
          'Ubicación del lote requerida',
          'Selecciona una ubicación específica del lote.',
          'warning'
        );
        return false;
      }

      return true;
    }

    return false;
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
      error: async (error) => {
        await this.generalService.loadingDismiss();
        await this.generalService.alert(
          'Verifica tu red',
          'Error de red. Intenta más tarde.',
          'danger'
        );
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
        .then((direccion) => {
          this.direccionCompleta = direccion;
        })
        .catch((error) => {
          this.direccionCompleta = 'No se pudo obtener la dirección.';
          console.warn(error);
        });
    } else {
      this.direccionSeleccionada = null; // Esperamos a que el usuario elija

      // ✅ Paso 2: Obtener direcciones legibles para todas las ubicaciones
      this.ubicacionesLoteLegibles = [];

      const promesas = this.ubicacionesLoteSeleccionado.map((dir) =>
        this.generalService.obtenerDireccionDesdeCoordenadas(dir.lat, dir.lng)
      );

      Promise.all(promesas)
        .then((direcciones) => {
          this.ubicacionesLoteLegibles = direcciones;
        })
        .catch((error) => {
          console.warn('❌ Error obteniendo direcciones:', error);
          this.ubicacionesLoteLegibles = this.ubicacionesLoteSeleccionado.map(() => 'No disponible');
        });
    }
  }
  
  quienLovende(num: number) {
    if (num == 0) {
      this.seccionFormulario = 2;
    } else if (num == 1) {
      this.seccionFormulario = 3;
      this.generarListaAnios();
    }
  }
  
  cambiarEstado(nuevoEstado: 'Nuevo' | 'Seminuevo') {
    this.estadoCamion = nuevoEstado;
  }
}