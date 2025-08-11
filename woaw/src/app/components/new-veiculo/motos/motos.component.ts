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
import { MotosService } from '../../../services/motos.service';
import { GeneralService } from '../../../services/general.service';
import { MapaComponent } from '../../modal/mapa/mapa.component';
import { FotosVeiculoComponent } from '../../modal/fotos-veiculo/fotos-veiculo.component';
import { Router, NavigationStart } from '@angular/router';

@Component({
  selector: 'app-motos',
  templateUrl: './motos.component.html',
  styleUrls: ['./motos.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class MotosComponent implements OnInit {
  estadoVehiculo: string = '';

  @Input() anio!: number;
  @Input() marca!: string;
  @Input() modelo!: string;
  @Input() tipo!: string;

  ubicacionSeleccionada: [string, string, number, number] | null = null;
  imagenesIntentadas: boolean = false;

  // INPUTS FORM ⬇️
  colorSeleccionado: string[] = [];
  colorSeleccionadoUnico: string = '';

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

  //
  public MyRole: string | null = null;
  opciones = [
    { label: 'Blanco' },
    { label: 'Negro' },
    { label: 'Gris' },
    { label: 'Plateado' },
    { label: 'Rojo' },
    { label: 'Azul' },
    { label: 'Azul marino' },
    { label: 'Azul cielo' },
    { label: 'Verde' },
    { label: 'Verde oscuro' },
    { label: 'Color militar' }, // 🪖 agregado
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
    { label: 'Grafito' },
    { label: 'Champagne' },
    { label: 'Titanio' },
    { label: 'Cobre' },
    { label: 'Camaleón' },
    { label: 'Perlado' }, // 💎 agregado
    { label: 'Mate' }, // 🛡️ agregado
    { label: 'Negro obsidiana' }, // ⚫ elegante
    { label: 'Blanco perla' }, // ⚪ brillante
    { label: 'Rojo cereza' }, // 🍒 clásico
    { label: 'Azul eléctrico' }, // ⚡ moderno
    { label: 'Gris plomo' },
  ];

  imagenesValidas: boolean = false;
  imagenPrincipal: File | null = null;
  imagenesSecundarias: File[] = [];

  constructor(
    private fb: FormBuilder,
    private carsService: CarsService,
    private generalService: GeneralService,
    private modalController: ModalController,
    private router: Router,
    private motosService: MotosService
  ) {}

  ngOnInit() {
    this.definirEstadoVehiculo();
  }

  definirEstadoVehiculo() {
    const anioActual = new Date().getFullYear();

    if (this.anio === anioActual) {
      this.estadoVehiculo = 'Nuevo';
    } else if (this.anio >= anioActual - 4) {
      this.estadoVehiculo = 'Seminuevo';
    } else if (this.anio < 2008 && this.anio >= 1800) {
      this.estadoVehiculo = 'Usado';
    } else {
      this.estadoVehiculo = 'Usado';
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

  // -----
  async EnviarVeiculo() {
    let validado: boolean = false;
    let appdata: FormData | false = false;

    validado = await this.validacionesAntesdeEnviarMoto();
    if (validado) {
      appdata = await this.prepararFormularioParaEnvioMoto();
    }

    if (!validado || !appdata) {
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
    this.generalService.loading('Guardando auto...');
    // Enviar a backend
    this.motosService.guardarMoto(appdata).subscribe({
      next: (res: any) => {
        this.generalService.loadingDismiss();
        if (res.token && res.rol) {
          // Obtener el usuario actual del localStorage
          const userActual = JSON.parse(localStorage.getItem('user') || '{}');
          userActual.rol = res.rol;
          localStorage.setItem('user', JSON.stringify(userActual));
          localStorage.setItem('token', res.token);
        }
        this.router.navigate(['/mis-motos']);
        // ocultar spinner
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

  async validacionesAntesdeEnviarMoto(): Promise<boolean> {
    // Verificar que el precio no sea menor a 10,000 y no mayor a 5,000,000
    if (this.precio < 5000 || this.precio > 5000000) {
      this.generalService.alert(
        'Precio inválido',
        'El precio debe estar entre 5000 y 5,000,000.',
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
        'El kilometraje debe ser un número valido entero positivo.',
        'warning'
      );
      return false;
    }

    if (this.kilometraje !== null && this.kilometraje > 180000) {
      this.generalService.alert(
        'Kilometraje elevado',
        'Este vehículo tiene más de 180,000 km. Puede ser difícil de vender o requerir mantenimiento importante.',
        'info'
      );
      return false;
    }

    // Validación de color
    if (this.estadoVehiculo === 'Nuevo') {
      if (!this.colorSeleccionado || this.colorSeleccionado.length === 0) {
        this.generalService.alert(
          'Color requerido',
          'Por favor, selecciona al menos un color para el vehículo nuevo.',
          'warning'
        );
        return false;
      }
    } else {
      if (
        !this.colorSeleccionadoUnico ||
        this.colorSeleccionadoUnico.trim() === ''
      ) {
        this.generalService.alert(
          'Color requerido',
          'Por favor, selecciona un color para el vehículo.',
          'warning'
        );
        return false;
      }
    }

    // 3. Validar descripción (obligatoria, máximo 100 caracteres)
    if (!this.descripcion || this.descripcion.trim().length === 0) {
      this.generalService.alert(
        'Descripción requerida',
        'Por favor escribe una breve descripción del vehículo.',
        'warning'
      );
      return false;
    }

    if (this.descripcion.trim().length > 500) {
      this.generalService.alert(
        'Descripción demasiado larga',
        'La descripción debe tener máximo 100 caracteres.',
        'warning'
      );
      return false;
    }

    // Validación de ubicación
    const ubicacionValida =
      this.ubicacionSeleccionada &&
      this.ubicacionSeleccionada.length === 4 &&
      typeof this.ubicacionSeleccionada[2] === 'number' &&
      typeof this.ubicacionSeleccionada[3] === 'number';

    if (!ubicacionValida) {
      this.generalService.alert(
        'Ubicación requerida',
        'Selecciona la ubicación del vehículo en el mapa.',
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

    if (this.estadoVehiculo !== 'Nuevo') {
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
    }

    if (this.cilindrada && this.cilindrada.trim().length > 0) {
      const valor = this.cilindrada.trim();

      if (valor.length > 25) {
        this.generalService.alert(
          'Cilindrada demasiado larga',
          'El tipo de cilindrada no puede tener más de 25 caracteres.',
          'warning'
        );
        return false;
      }

      const cilindradaValida = /^\d{1,4}cc$/.test(valor);
      if (!cilindradaValida) {
        this.generalService.alert(
          'Cilindrada inválida',
          'La cilindrada debe tener el formato correcto (Ej. 1000cc).',
          'warning'
        );
        return false;
      }
    }

    if (this.tipoMotor?.trim().length > 0) {
      if (this.tipoMotor.trim().length > 25) {
        this.generalService.alert(
          'Tipo de Motor demasiado largo',
          'El tipo de motor no puede tener más de 25 caracteres.',
          'warning'
        );
        return false;
      }
    }

    if (this.transmision?.trim().length > 0) {
      if (this.transmision.trim().length > 25) {
        this.generalService.alert(
          'Transmisión demasiado larga',
          'La transmisión no puede tener más de 25 caracteres.',
          'warning'
        );
        return false;
      }
    }

    if (this.combustible?.trim().length > 0) {
      if (this.combustible.trim().length > 25) {
        this.generalService.alert(
          'Combustible demasiado largo',
          'El tipo de combustible no puede tener más de 25 caracteres.',
          'warning'
        );
        return false;
      }
    }

    if (this.frenos?.trim().length > 0) {
      if (this.frenos.trim().length > 25) {
        this.generalService.alert(
          'Frenos demasiado largos',
          'El tipo de frenos no puede tener más de 25 caracteres.',
          'warning'
        );
        return false;
      }
    }

    if (this.suspension?.trim().length > 0) {
      if (this.suspension.trim().length > 25) {
        this.generalService.alert(
          'Suspensión demasiado larga',
          'El tipo de suspensión no puede tener más de 25 caracteres.',
          'warning'
        );
        return false;
      }
    }

    return true;
  }

  async prepararFormularioParaEnvioMoto(): Promise<FormData | false> {
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

    // Si NO es nuevo, tomar el valor único y colocarlo en el array
    if (this.estadoVehiculo !== 'Nuevo') {
      this.colorSeleccionado = this.colorSeleccionadoUnico
        ? [this.colorSeleccionadoUnico]
        : [];
    }

    this.colorSeleccionado.forEach((color) => {
      formData.append('color[]', color);
    });

    formData.append('tipoVenta', this.estadoVehiculo);

    formData.append('tipoMotor', this.tipoMotor);
    formData.append('cilindrada', this.cilindrada);
    formData.append('transmision', this.transmision);
    formData.append('combustible', this.combustible);
    formData.append('frenos', this.frenos);
    formData.append('suspension', this.suspension);
    formData.append('precio', this.precio.toString());

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

  toggleColorSeleccionado(color: string): void {
    const index = this.colorSeleccionado.indexOf(color);
    if (index >= 0) {
      this.colorSeleccionado.splice(index, 1);
    } else {
      this.colorSeleccionado.push(color);
    }
  }
}
