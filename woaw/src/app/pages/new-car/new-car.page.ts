import { Component, OnInit } from '@angular/core';
import { GeneralService } from '../../services/general.service';
import { CarsService } from '../../services/cars.service';
import { MotosService } from '../../services/motos.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuController } from '@ionic/angular';

interface Marca {
  key: string;
  nombre: string;
  imageUrl: string;
}

@Component({
  selector: 'app-new-car',
  templateUrl: './new-car.page.html',
  styleUrls: ['./new-car.page.scss'],
  standalone: false,
})
export class NewCarPage implements OnInit {
  // ----- Variables
  seleccion: 'auto' | 'moto' | 'renta' | 'lote' | 'camion' | null = null;
  mostrarSelecion: string = '';
  mostrarIcono: string = '';
  mostrarCarComponent: boolean = false;
  opcionesBase = [
    {
      tipo: 'auto',
      label: 'Coches',
      icono: 'assets/img/icon-coche.png',
      proximamente: false,
    },
    {
      tipo: 'moto',
      label: 'Motos',
      icono: 'assets/img/icon-moto.png',
      proximamente: false,
    },
    {
      tipo: 'camion',
      label: 'Camiones',
      icono: 'assets/img/icon-camion.png',
      proximamente: false,
    },
    {
      tipo: 'renta',
      label: 'Renta',
      icono: 'assets/img/icon-renta.png',
      proximamente: true,
    },
    {
      tipo: 'lote',
      label: 'Lote',
      icono: 'assets/img/icon-lote.png',
      proximamente: false,
    },
  ];

  opciones: any[] = [];

  listaAnios: number[] = [];
  anioSeleccionado: string = '';
  anioManual: string = '';
  mostrarInputOtroAnio: boolean = false;
  anioValido: boolean = false;
  marcaSeleccionada: string = '';
  modeloSeleccionado: string = '';
  modeloEsPersonalizado: boolean = false;
  marcaEsPersonalizada: boolean = false;

  public isLoggedIn: boolean = false;

  // -----
  marcas: any[] = [];
  modelos: any[] = [];

  public MyRole: string | null = null;
  public esDispositivoMovil: boolean = false;
  public dispositivo: string = '';
  mansaje_error: string = '';
  // -----
  constructor(
    private generalService: GeneralService,
    private carsService: CarsService,
    private router: Router,
    private motosService: MotosService,
    private menuCtrl: MenuController,
  ) {
    this.generalService.tipoRol$.subscribe((rol) => {
      this.MyRole = rol;
    });
    // Detectar tipo de dispositivo
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
      this.dispositivo = tipo;
    });
  }

  ngOnInit() {
    this.menuCtrl.close('menuLateral');
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });

    this.generarListaAnios();
    this.cargarOpcionesPorRol();
  }
  seleccionar(tipo: 'auto' | 'moto' | 'renta' | 'lote' | null, label: string, icono: string) {
    if (label === 'Lote') {
      this.mostrarCarComponent = true;
    } else {
      this.limpiarDependencias('all');
    }
    this.seleccion = tipo;
    this.mostrarSelecion = label;
    this.mostrarIcono = icono;

    this.anioSeleccionado = '';
    this.anioManual = '';
  }
  cargarOpcionesPorRol() {
    if (this.MyRole === 'admin') {
      this.opciones = [...this.opcionesBase]; // todas las opciones
    } else {
      this.opciones = this.opcionesBase.filter(
        (op) => op.tipo !== 'arrendamiento'
      );
    }
  }
  generarListaAnios() {
    const anioActual = new Date().getFullYear();
    const anioLimite = 2008;

    for (let i = anioActual; i >= anioLimite; i--) {
      // Si NO es admin y es el año actual, lo saltamos
      if (this.MyRole !== 'admin' && i === anioActual) {
        continue;
      }
      this.listaAnios.push(i);
    }
  }
  // verifica el año al escribir o selecionar
  verificarAnio(tipo: 'select' | 'escrito') {
    this.limpiarDependencias('all');
    this.mostrarInputOtroAnio = this.anioSeleccionado === 'otro';

    const anio = this.obtenerAnioActual();
    // console.log(anio)
    this.anioValido =
      tipo === 'select' ? this.validarAnio(anio) : this.validarAniOtro(anio);

    if (this.anioValido) {
      this.mansaje_error = '';
      this.obtenerMarcasSiCorresponde(anio);
    } else {
      this.mansaje_error = 'Seleciona un año entre 2007 y 1900';
      // console.log(this.mansaje_error);
      // this.limpiarDependencias('all');
      return;
    }
  }
  validarAniOtro(anio: number): boolean {
    return anio >= 1801 && anio < 2008;
  }
  // Valida que el año esté en el rango permitido
  validarAnio(anio: number): boolean {
    const anioActual = new Date().getFullYear();
    return !isNaN(anio) && anio >= 1800 && anio <= anioActual;
  }
  esAnioAnteriorA2008(): boolean {
    const anio = this.obtenerAnioActual();
    return this.anioValido && anio < 2008;
  }
  // Extrae el año seleccionado o manual
  obtenerAnioActual(): number {
    return this.mostrarInputOtroAnio
      ? Number(this.anioManual)
      : Number(this.anioSeleccionado);
  }
  // Limpia los campos relacionados si el año no es válido 🚮
  limpiarDependencias(tipo: string): void {
    if (tipo === 'marca') {
      this.modeloSeleccionado = '';
      this.modeloEsPersonalizado = false;
      this.mostrarCarComponent = false;
      this.mansaje_error = '';
    } else if (tipo === 'modelo') {
      this.mostrarCarComponent = false;
      this.mansaje_error = '';
    } else if (tipo === 'all') {
      this.marcaSeleccionada = '';
      this.modeloSeleccionado = '';

      // this.anioSeleccionado = '';
      // this.anioManual = '';
      this.modeloEsPersonalizado = false;
      this.marcaEsPersonalizada = false;

      this.marcas = [];
      this.modelos = [];
      this.mostrarCarComponent = false;
      this.mansaje_error = '';
    }
  }
  selecionarModelo() {
    this.limpiarDependencias('modelo');
    if (this.modeloSeleccionado === 'otro') {
      this.modeloEsPersonalizado = true;
      this.modeloSeleccionado = '';
    } else {
      this.modeloEsPersonalizado = false;
    }
  }
  formularioValido(): boolean {
    const anio = this.obtenerAnioActual();
    const anioActual = new Date().getFullYear();
    const anioEsValido = this.anioValido && anio >= 1800 && anio <= anioActual;

    const marcaValida =
      !!this.marcaSeleccionada && this.marcaSeleccionada !== '';
    const modeloValido =
      !!this.modeloSeleccionado &&
      this.modeloSeleccionado.trim().length > 0 &&
      this.modeloSeleccionado.length <= 25;

    return !!anioEsValido && marcaValida && modeloValido;
  }
  mostrarComponente() {
    const anio = this.obtenerAnioActual();
    const marca = this.marcaSeleccionada;
    const modelo = this.modeloSeleccionado;
    const tipo = this.seleccion;

    if (this.anioValido && marca && modelo) {
      switch (tipo) {
        case 'auto':
          this.mostrarCarComponent = true;
          break;
        case 'moto':
          this.mostrarCarComponent = true;
          break;
        case 'camion':
          this.mostrarCarComponent = true;
          break;
        default:
          this.generalService.alert(
            'Tipo no soportado',
            'El tipo seleccionado no tiene un componente asociado.',
            'warning'
          );
          this.mostrarCarComponent = false;
          break;
      }
    } else {
      this.generalService.alert(
        'Datos incompletos',
        'Debes seleccionar un año válido, una marca y escribir o elegir un modelo para continuar.',
        'warning'
      );
      this.mostrarCarComponent = false;
    }
  }
  volverAtras() {
    this.mostrarCarComponent = false;
    if (this.seleccion === 'lote') {
      this.seleccion = null;
    }
  }
  regresar() {
    // this.router.navigate(['/nuevos']);
    window.history.back();
  }
  getMarcaNombreSeleccionada(): string {
    if (!this.marcaEsPersonalizada) {
      const marcaObj = this.marcas.find(
        (m) => m._id === this.marcaSeleccionada
      );
      return marcaObj?.nombre || '';
    } else if (this.marcaEsPersonalizada) {
      return this.marcaSeleccionada;
    }
    return this.marcaSeleccionada;
  }
  validarInputModelo(): void {
    // Aquí podrías validar que lo escrito tenga sentido
    if (!this.modeloSeleccionado || this.modeloSeleccionado.trim().length < 2) {
      this.modeloSeleccionado = '';
      this.modeloEsPersonalizado = false;
    }
  }

  // ## ----- ----- PETICIONES DE CACHES, MOTOS, CAMIONES 🛻 ----- -----
  obtenerMarcasSiCorresponde(anio: number): void {
    switch (this.seleccion) {
      case 'auto':
        this.PeticionesMarcasDeAutos(anio);
        break;
      case 'moto':
        this.PeticionesMarcasDeMotos();
        break;
        case 'camion':
          this.PeticionesMarcasDeCamion();
          break;
      case 'renta':
        console.log('Camiones próximamente...');
        break;
      case 'lote':
        console.log('Arrendamiento próximamente...');
        break;
      default:
        console.warn('Tipo no reconocido:', this.seleccion);
        break;
    }
  }
  obtenerModelosSiCorresponde(): void {

    this.limpiarDependencias('marca');

    if (this.marcaSeleccionada === 'otro') {
      this.marcaSeleccionada = '';
      this.marcaEsPersonalizada = true;
      this.modelos = [];
      return;
    }

    switch (this.seleccion) {
      case 'auto':
        this.PeticionesModelosDeAutos();
        break;
      case 'moto':
        this.PeticionesModelosDeMotos();
        break;
        case 'camion':
        this.PeticionesModelosDeCamion();
        break;
      case 'renta':
        console.log('Camiones próximamente...');
        break;
      case 'lote':
        console.log('Arrendamiento próximamente...');
        break;
      default:
        console.warn('Tipo no reconocido:', this.seleccion);
        break;
    }
  }

  //
  PeticionesMarcasDeAutos(anio: number) {
    const anioActual = new Date().getFullYear();
    if (anio >= 2008 && anio <= anioActual) {
      this.carsService.GetMarcas(anio).subscribe({
        next: (data) => {
          this.marcas = data;
        },
        error: (error) => {
          console.error('Error al obtener marcas:', error);
        },
        complete: () => {
          this.generalService.loadingDismiss();
        },
      });
    } else if (anio < 2008 && anio >= 1800) {
      this.carsService.getMarcas_all().subscribe({
        next: (data: Marca[]) => {
          this.marcas = data.sort((a: Marca, b: Marca) =>
            a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase())
          );
        },
        error: (err) => {
          const mensaje =
            err?.error?.message || 'Error al cargar marcas - Carros';
          console.warn(mensaje);
        },
        complete: () => {
          this.generalService.loadingDismiss();
        },
      });
    } else {
      console.log('no se ejcuta nada');
    }
  }
  PeticionesMarcasDeMotos() {
    this.motosService.getMarcas().subscribe({
      next: (data: Marca[]) => {
        // console.log('Motos = ',data)
        this.marcas = data.sort((a: Marca, b: Marca) =>
          a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase())
        );
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Error al cargar marcas - Motos';
        console.warn(mensaje);
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }
  PeticionesMarcasDeCamion() {
    this.carsService.GetMarcasCamiones().subscribe({
      next: (data: Marca[]) => {
        // console.log('Motos = ',data)
        this.marcas = data.sort((a: Marca, b: Marca) =>
          a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase())
        );
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Error al cargar marcas - camiones';
        console.warn(mensaje);
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }
  PeticionesModelosDeAutos() {
    const anio = this.obtenerAnioActual();
    const marca = this.marcaSeleccionada;

    if (!anio || !marca || this.seleccion !== 'auto') {
      console.log('No se cumplen las condiciones para obtener modelos');
      return;
    }

    this.carsService.GetModelos(marca, anio).subscribe({
      next: (data) => {
        this.modelos = data;
      },
      error: (error) => {
        console.error('Error al obtener modelos:', error);
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }
  PeticionesModelosDeCamion() {
    const marca = this.marcaSeleccionada;

    if (!marca || this.seleccion !== 'camion') {
      console.log('No se cumplen las condiciones para obtener modelos');
      return;
    }

    this.carsService.GetModelosCamiones(marca).subscribe({
      next: (data) => {
        this.modelos = data;
      },
      error: (error) => {
        console.error('Error al obtener modelos:', error);
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }
  PeticionesModelosDeMotos() {
    const anio = this.obtenerAnioActual();
    const marca = this.marcaSeleccionada;

    this.limpiarDependencias('marca');

    if (!anio || !marca || this.seleccion !== 'moto') {
      this.generalService.alert(
        'Datos incompletos',
        'Por favor, selecciona un año y una marca antes de continuar.',
        'warning'
      );
      return;
    }

    this.motosService.GetModelos(marca).subscribe({
      next: (data) => {
        this.modelos = data;
      },
      error: (error) => {
        console.error('Error al obtener modelos:', error);
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }
  irAInicio(): void {
    this.router.navigateByUrl('/inicio');
  }
}
