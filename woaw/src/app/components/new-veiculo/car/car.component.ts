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
import { CarsService } from '../../../services/cars.service';
import { GeneralService } from '../../../services/general.service';
import { MapaComponent } from '../../modal/mapa/mapa.component';
import { FotosVeiculoComponent } from '../../modal/fotos-veiculo/fotos-veiculo.component';
import { Router, NavigationStart } from '@angular/router';
import { RegistroService } from '../../../services/registro.service';
import { ContactosService } from './../../../services/contactos.service';

@Component({
  selector: 'app-car',
  templateUrl: './car.component.html',
  styleUrls: ['./car.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class CarComponent implements OnInit {
  estadoVehiculo: 'Nuevo' | 'Usado' | 'Seminuevo' | '' = '';
  @Input() anio!: number;
  @Input() marca!: string;
  @Input() modelo!: string;
  @Input() tipo!: string;

  listaAnios: number[] = [];
  lotes: any[] = [];
  totalLotes: number = 0;
  direccionCompleta: string = 'Obteniendo ubicación...';

  estadoVehiculo_logico: string = '';
  versiones: any[] = [];
  ubicacionSeleccionada: [string, string, number, number] | null = null;
  versionSeleccionada: boolean[] = [];
  preciosVersiones: { [version: string]: number } = {};
  esUsadoAntiguo: boolean = false;
  imagenesIntentadas: boolean = false;
  versionesDisponibles: boolean = false;

  public Pregunta: 'no' | 'si' | null = null;
  tipoSeleccionado: 'particular' | 'lote' = 'particular';

  ubicacionesLoteLegibles: string[] = [];

  loteSeleccionado: string | null = null;
  direccionSeleccionada: any = null;
  ubicacionesLoteSeleccionado: any[] = [];
  seccionFormulario: 1 | 2 | 3 = 1;

  // INPUTS FORM ⬇️
  versionSeleccionadaTexto: string = '';
  colorSeleccionado: string = '';
  precio: number | null = null;
  placas: string = '';
  kilometraje: number | null = null;
  descripcion: string = '';
  moneda: 'MXN' | 'USD' = 'MXN';
  extrasTexto: string = '';
  
  precioEstimado: number | null = null;
  tipoFactura: string = '';

  // -----
  public MyRole: 'admin' | 'lotero' | 'vendedor' | 'cliente' | null = null;
  opciones = [
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
    { label: 'Morado' },
    { label: 'Vino' },
    { label: 'Oro' },
    { label: 'Bronce' },
    { label: 'Turquesa' },
    { label: 'Gris Oxford' },
    { label: 'Arena' },
    { label: 'Azul cielo' },
    { label: 'Grafito' },
    { label: 'Champagne' },
    { label: 'Titanio' },
    { label: 'Cobre' },
    { label: 'Camaleón' },
    { label: 'Otro' },
  ];
  especificacionesVersion: any = {
    motor: '',
    cilindros: '',
    potencia: '',
    combustible: '',
    transmision: '',
    traccion: '',
    puertas: '',
    pasajeros: '',
    rines: '',
    tipoVehiculo: '',
  };
  camposViejito: Record<string, string> = {
    motor: '',
    cilindros: '',
    potencia: '',
    combustible: '',
    transmision: '',
    traccion: '',
    puertas: '',
    pasajeros: '',
    rines: '',
    tipoVehiculo: '',
  };
  camposEspecificaciones: string[] = [
    'motor',
    'cilindros',
    'potencia',
    'combustible',
    'transmision',
    'traccion',
    'puertas',
    'pasajeros',
    'rines',
    'tipoVehiculo',
  ];
  ejemplosCampos: Record<string, string> = {
    motor: '2.0L Turbo',
    cilindros: '4',
    potencia: '150 hp',
    combustible: 'Gasolina',
    transmision: 'Automática',
    traccion: 'Delantera',
    puertas: '4',
    pasajeros: '5',
    rines: '18 pulgadas',
    tipoVehiculo: 'Sedán',
  };
  etiquetasCampos: Record<string, string> = {
    motor: 'Motor',
    cilindros: 'Cilindros',
    potencia: 'Potencia',
    combustible: 'Combustible',
    transmision: 'Transmisión',
    traccion: 'Tracción',
    puertas: 'Puertas',
    pasajeros: 'Pasajeros',
    rines: 'Rines',
    tipoVehiculo: 'Tipo de vehículo',
  };

  imagenesValidas: boolean = false;
  imagenPrincipal: File | null = null;
  imagenesSecundarias: File[] = [];

  constructor(
    private fb: FormBuilder,
    private carsService: CarsService,
    private generalService: GeneralService,
    private modalController: ModalController,
    private router: Router,
    private registroService: RegistroService,
    public contactosService: ContactosService,
  ) { }

  async ngOnInit() {
    this.generalService.tipoRol$.subscribe((rol) => {
      if (rol === 'admin' || rol === 'lotero' || rol === 'vendedor' || rol === 'cliente') {
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
      this.getLotes('all');
    } else if (this.MyRole === 'lotero') {
      this.Pregunta = 'si';
      this.seccionFormulario = 2;
      this.tipoSeleccionado = 'lote';
      this.getLotes('mios');
    } else {
      this.Pregunta = 'no';
      this.seccionFormulario = 1;
      this.tipoSeleccionado = 'particular';
    }
    this.obtenerVersiones();
  }
  seleccionarTipo(tipo: 'particular' | 'lote') {
    this.tipoSeleccionado = tipo;
  }
  generarListaAnios() {
    const anioActual = new Date().getFullYear();
    for (let i = anioActual; i >= 1900; i--) {
      this.listaAnios.push(i);
    }
  }
  continuar() {
    if (!this.tipoSeleccionado) return;
    // if (this.tipoSeleccionado == 'lote') {
    //   this.getLotes('mios');
    // }
    this.Pregunta = 'no';
  }
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

      this.carsService.GetVersiones(anio, this.marca, this.modelo).subscribe({
        next: (data) => {
          this.versiones = data || [];
          this.versionesDisponibles =
            Array.isArray(this.versiones) && this.versiones.length > 0;
          this.generalService.loadingDismiss();
          this.definirEstadoVehiculo();
        },
        error: (error) => {
          console.error('Error al obtener versiones:', error);
          this.generalService.loadingDismiss();
          this.definirEstadoVehiculo();
          this.versiones = [];
        },
      });
    }
  }
  onSeleccionVersion(version: string) {
    if (this.modelo && this.anio && this.marca) {
      this.carsService
        .EspesificacionesVersion(this.anio, this.marca, this.modelo, version)
        .subscribe({
          next: (data) => {
            console.log(data);
            this.especificacionesVersion = data?.[0] || null;
          },
          error: (error) => {
            console.error('Error al obtener especificaciones:', error);
            this.generalService.alert(
              'Error',
              'No se pudieron obtener las especificaciones. Intente nuevamente.',
              'danger'
            );
          },
          complete: () => {
            this.generalService.loadingDismiss();
          },
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
      componentProps: {
        estadoVehiculo: this.estadoVehiculo,
      },
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data) {
      this.imagenesIntentadas = true;
      this.imagenPrincipal = data.imagenPrincipal;
      this.imagenesSecundarias = data.imagenesSecundarias;

      // 🔍 Validación por tipo de vehículo
      if (this.estadoVehiculo === 'Nuevo') {
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
        this.estadoVehiculo === 'Seminuevo' ||
        this.estadoVehiculo === 'Usado'
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
  toggleVersion(index: number, version: string): void {
    this.versionSeleccionada[index] = !this.versionSeleccionada[index];

    if (!this.versionSeleccionada[index]) {
      delete this.preciosVersiones[version];
    }
  }

  // # ----- -----
  // ENVIO DEL FORM ✅✅
  // # ----- -----

  async EnviarVeiculo() {
    let validado: boolean = false;
    let appdata: FormData | false = false;
    if (this.estadoVehiculo === 'Nuevo') {
      validado = await this.validacionesAntesdeEnviarForm_Nuevos();
      if (validado) {
        appdata = await this.prepararFormularioParaEnvio_Nuevo();
      }
    } else if (
      this.estadoVehiculo === 'Seminuevo' ||
      this.estadoVehiculo === 'Usado'
    ) {
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
      'Al continuar, confirmas que los datos proporcionados sobre tu vehículo son correctos y estás consciente de que serán publicados.'
    );
  }
  async enviarDatos(appdata: FormData) {
    // Enviar a backend
    this.generalService.loading('Guardando auto...');
    this.carsService.guardarAutos(appdata, this.estadoVehiculo).subscribe({
      next: (res: any) => {
        if (res.token && res.rol) {
          const userActual = JSON.parse(localStorage.getItem('user') || '{}');
          userActual.rol = res.rol;
          localStorage.setItem('user', JSON.stringify(userActual));
          localStorage.setItem('token', res.token);
        }
        this.router.navigate(['/mis-autos']);
        this.generalService.loadingDismiss();
        this.generalService.alert(
          '¡Auto agregado correctamente!',
          'El aúto fue agregado correctamente.',
          'success'
        );
      },
      error: (err) => {
        this.generalService.loadingDismiss();
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert(
          '¡Algo salió mal!',
          'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
          'danger'
        );
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }
  async validacionesAntesdeEnviarForm_Nuevos(): Promise<boolean> {
    if (!this.validarUbicacion()) {
      return false;
    }
    // 1. Validar que haya al menos una versión seleccionada
    const versionesSeleccionadas = this.versionSeleccionada
      .map((seleccionada, index) =>
        seleccionada ? this.versiones[index] : null
      )
      .filter(Boolean);

    if (versionesSeleccionadas.length === 0) {
      this.generalService.alert(
        'Versión requerida',
        'Debes seleccionar al menos una versión del vehículo.',
        'warning'
      );
      return false;
    }

    // Precios
    for (const version of versionesSeleccionadas) {
      const precio = this.preciosVersiones[version];

      // Validar que el precio sea un número y esté definido
      if (typeof precio !== 'number' || isNaN(precio)) {
        this.generalService.alert(
          'Precio faltante',
          `Debes asignar un precio válido a la versión: ${version}`,
          'warning'
        );
        return false;
      }

      // Validar rango permitido
      if (precio < 15000 || precio > 10000000) {
        this.generalService.alert(
          'Precio inválido',
          `El precio para la versión "${version}" debe estar entre $15,000 y $10,000,000.`,
          'warning'
        );
        return false;
      }
    }

    // 3. Validar descripción (obligatoria, máximo 100 caracteres)
    // if (!this.descripcion || this.descripcion.trim().length === 0) {
    //   this.generalService.alert(
    //     'Descripción requerida',
    //     'Por favor escribe una breve descripción del vehículo.',
    //     'warning'
    //   );
    //   return false;
    // }

    // if (this.descripcion.trim().length > 100) {
    //   this.generalService.alert(
    //     'Descripción demasiado larga',
    //     'La descripción debe tener máximo 100 caracteres.',
    //     'warning'
    //   );
    //   return false;
    // }
    // Validación de ubicación
    // const ubicacionValida =
    //   this.ubicacionSeleccionada &&
    //   this.ubicacionSeleccionada.length === 4 &&
    //   typeof this.ubicacionSeleccionada[2] === 'number' &&
    //   typeof this.ubicacionSeleccionada[3] === 'number';

    // if (!ubicacionValida) {
    //   this.generalService.alert(
    //     'Ubicación requerida',
    //     'Selecciona la ubicación del vehículo en el mapa.',
    //     'warning'
    //   );
    //   return false;
    // }
    // Validación de imágenes
    if (!this.imagenPrincipal) {
      this.generalService.alert(
        'Falta imagen principal',
        'Selecciona una imagen principal para continuar.',
        'warning'
      );
      return false;
    }

    return true;
  }
  async prepararFormularioParaEnvio_Nuevo(): Promise<FormData | false> {
    const formData = new FormData();
    // formData.append('descripcion', this.descripcion || '');
    formData.append('anio', this.anio.toString());
    formData.append('marca', this.marca);
    formData.append('modelo', this.modelo);

    const versionesSeleccionadas = this.versionSeleccionada
      .map((seleccionada, index) =>
        seleccionada ? this.versiones[index] : null
      )
      .filter(Boolean);

    const versionesConPrecio = versionesSeleccionadas.map((version) => ({
      Name: version,
      Precio: this.preciosVersiones[version] || 0,
    }));

    formData.append('version', JSON.stringify(versionesConPrecio));

    if (this.ubicacionSeleccionada) {
      const ubicacionObj = {
        ciudad: this.ubicacionSeleccionada[0],
        estado: this.ubicacionSeleccionada[1],
        lat: this.ubicacionSeleccionada[2],
        lng: this.ubicacionSeleccionada[3],
      };

      formData.append('ubicacion', JSON.stringify(ubicacionObj));
    }

    if (this.imagenPrincipal) {
      formData.append('imagenPrincipal', this.imagenPrincipal);
      formData.append('imagenes', this.imagenPrincipal);
    }

    if (this.imagenesSecundarias.length > 0) {
      for (const file of this.imagenesSecundarias) {
        formData.append('imagenes', file);
      }
    }

    return formData;
  }
  async validacionesAntesdeEnviarForm_Usados(): Promise<boolean> {
    if (!this.validarUbicacion()) {
      return false;
    }

    // versión
    if (
      !this.versionSeleccionadaTexto ||
      this.versionSeleccionadaTexto.trim() === ''
    ) {
      this.generalService.alert(
        'Versión requerida',
        'Por favor, selecciona o escribe una versión del vehículo.',
        'warning'
      );
      return false;
    }

    // Validación de precio
    const precioValido =
      this.precio &&
      Number.isInteger(this.precio) &&
      this.precio >= 15000 &&
      this.precio <= 10000000;

    if (!precioValido) {
      this.generalService.alert(
        'Precio inválido',
        'El precio debe ser un número entero entre $15,000 y $10,000,000.',
        'warning'
      );
      return false;
    }

    // Validación de placas (opcional)
    if (this.placas && this.placas.trim() !== '') {
      const longitud = this.placas.trim().length;
      const formatoValido = /^[A-Za-z0-9-]+$/.test(this.placas);

      if (longitud < 6 || longitud > 12 || !formatoValido) {
        this.generalService.alert(
          'Placas inválidas',
          'Las placas deben tener entre 6 y 12 caracteres y solo pueden incluir letras, números y guiones.',
          'warning'
        );
        return false;
      }
    }

    // Validación de kilometraje
    const kilometrajeValido =
      this.kilometraje !== null &&
      Number.isInteger(this.kilometraje) &&
      this.kilometraje >= 0;

    if (!kilometrajeValido) {
      this.generalService.alert(
        'Kilometraje inválido',
        'El kilometraje debe ser un número entero positivo.',
        'warning'
      );
      return false;
    }

    if (this.kilometraje !== null && this.kilometraje > 450000) {
      this.generalService.alert(
        'Kilometraje elevado',
        'Este vehículo tiene más de 180,000 km. Puede ser difícil de vender o requerir mantenimiento importante.',
        'info'
      );
      return false;
    }

    // Validación de color
    if (!this.colorSeleccionado || this.colorSeleccionado.trim() === '') {
      this.generalService.alert(
        'Color requerido',
        'Por favor, selecciona un color para el vehículo.',
        'warning'
      );
      return false;
    }

    // Validación de descripción
    if (!this.descripcion || this.descripcion.trim().length === 0) {
      this.generalService.alert(
        'Descripción requerida',
        'Por favor escribe una breve descripción del vehículo.',
        'warning'
      );
      return false;
    }

    if (this.descripcion.trim().length > 100) {
      this.generalService.alert(
        'Descripción demasiado larga',
        'La descripción debe tener máximo 100 caracteres.',
        'warning'
      );
      return false;
    }

    // Validación de imágenes
    if (!this.imagenPrincipal) {
      this.generalService.alert(
        'Falta imagen principal',
        'Selecciona una imagen principal para continuar.',
        'warning'
      );
      return false;
    }

    if (
      !Array.isArray(this.imagenesSecundarias) ||
      this.imagenesSecundarias.length < 2
    ) {
      this.generalService.alert(
        'Imágenes secundarias insuficientes',
        'Debes seleccionar al menos 2 imágenes secundarias.',
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
  async prepararFormularioParaEnvio_Usado(): Promise<FormData | false> {
    const formData = new FormData();

    formData.append('anio', this.anio.toString());
    formData.append('marca', this.marca);
    formData.append('modelo', this.modelo);
    formData.append('moneda', this.moneda);
    formData.append(
      'placas',
      this.placas?.trim() ? this.placas.toUpperCase() : 'null'
    );
    formData.append('descripcion', this.descripcion || '');
    formData.append('kilometraje', this.kilometraje?.toString() || '0');
    formData.append('color', this.colorSeleccionado);

    const versionObj = {
      Name: this.versionSeleccionadaTexto,
      Precio: this.precio,
    };
    formData.append('version', JSON.stringify(versionObj));

    if (
      this.estadoVehiculo_logico === 'seminuevo' ||
      this.estadoVehiculo_logico === 'usado'
    ) {
      for (const campo of this.camposEspecificaciones) {
        const valor = this.especificacionesVersion?.[campo];

        if (campo === 'extra' && Array.isArray(valor)) {
          formData.append(campo, valor.length > 0 ? JSON.stringify(valor) : '');
        } else {
          const valorValido =
            valor !== null &&
            valor !== undefined &&
            !(Array.isArray(valor) && valor.length === 0) &&
            (typeof valor !== 'string' || valor.trim() !== '');

          formData.append(campo, valorValido ? valor : '');
        }
      }
    } else if (this.estadoVehiculo_logico === 'viejito') {
      for (const campo of this.camposEspecificaciones) {
        const valor = this.camposViejito[campo];

        if (campo === 'extra') {
          const listaExtras = this.extrasTexto
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e !== '');
          formData.append(
            'extra',
            listaExtras.length > 0 ? JSON.stringify(listaExtras) : ''
          );
        } else {
          formData.append(campo, valor?.trim() || '');
        }
      }
    }

    // Obtener ubicación para ambos casos
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

    if (ubicacionObj) {
      formData.append('ubicacion', JSON.stringify(ubicacionObj));
    }

    if (this.imagenPrincipal) {
      formData.append('imagenPrincipal', this.imagenPrincipal);
      formData.append('imagenes', this.imagenPrincipal);
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
    const esLote = this.tipoSeleccionado === 'lote';

    if (esParticular) {
      const valida =
        this.ubicacionSeleccionada &&
        this.ubicacionSeleccionada.length === 4 &&
        typeof this.ubicacionSeleccionada[2] === 'number' &&
        typeof this.ubicacionSeleccionada[3] === 'number';

      if (!valida) {
        this.generalService.alert(
          'Ubicación requerida',
          'Selecciona la ubicación del vehículo en el mapa.',
          'warning'
        );
        return false;
      }

      return true;
    }

    if (esLote) {
      const lote = this.lotes.find(l => l._id === this.loteSeleccionado);
      if (!lote) {
        this.generalService.alert(
          'Lote requerido',
          'Selecciona un lote válido.',
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
        console.log(res);
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
    this.estadoVehiculo = nuevoEstado;
    // console.log('Estado cambiado a:', nuevoEstado);
  }
}
