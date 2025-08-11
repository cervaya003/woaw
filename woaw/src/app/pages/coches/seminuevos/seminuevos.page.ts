import { Component, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { GeneralService } from '../../../services/general.service';
import { CarsService } from '../../../services/cars.service';
import { ListComponent } from '../../../components/filtos/list/list.component';
import { PopoverController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';

import { IonContent } from '@ionic/angular';
import { ViewChild } from '@angular/core';

interface Auto {
  marca: string;
  modelo: string;
  anio: number;
  tipo: string;
  precio: number;
  imagen: string;
}

@Component({
  selector: 'app-seminuevos',
  templateUrl: './seminuevos.page.html',
  styleUrls: ['./seminuevos.page.scss'],
  standalone: false,
})
export class SeminuevosPage implements OnInit {
  esDispositivoMovil: boolean = false;
  autosStorage: any[] = [];
  filtros = [
    { label: 'Marca', tipo: 'marca' },
    { label: 'Precio', tipo: 'precio' },
    { label: 'Tipo', tipo: 'tipo' },
    { label: 'Año', tipo: 'anio' },
    // { label: 'Color', tipo: 'color' },
  ];
  @ViewChild('pageContent') content!: IonContent;
  // ## ----- ☢️☢️☢️☢️
  filtrosAplicados: any = {
    precio: null,
    anio: null,
    color: null,
    marca: null,
  };
  public totalAutos: number = 0;

  paginaActual = 1;
  itemsPorPagina!: number;
  totalPaginas = 1;
  paginas: number[] = [];

  usuario: any;

  public isLoggedIn: boolean = false;
  public MyRole: string | null = null;

  autosPaginados: any[] = [];
  showSplash: boolean = true;

  ordenActivo: string | null = null;

  autosFavoritosIds: Set<string> = new Set();

  public autosFiltrados: any[] = [];
  public idsMisAutos: string[] = [];

  public mostrarPendientes: boolean = false;

  constructor(
    private menu: MenuController,
    public generalService: GeneralService,
    private popoverCtrl: PopoverController,
    public carsService: CarsService,
    private modalCtrl: ModalController,
    private router: Router
  ) {}

  ngOnInit() {
    const storage = localStorage.getItem('user');
    if (storage) {
      const usuario = JSON.parse(storage);
      this.mostrarPendientes = usuario.email === 'glenditaa.003@gmail.com';
    }
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    this.generalService.tipoRol$.subscribe((rol) => {
      this.MyRole = rol;
    });
    this.generalService.valorGlobal$.subscribe((valor) => {
      this.itemsPorPagina = valor;
    });
    this.getCarsSeminuevos();
  }

  async misAutos() {
    if (!this.isLoggedIn) {
      this.idsMisAutos = [];
      return;
      // public idsMisAutos: string[] = [];
    }
    this.carsService.misAutosId().subscribe({
      next: (res: any) => {
        if (res && Array.isArray(res.vehicleIds) && res.vehicleIds.length > 0) {
          this.idsMisAutos = res.vehicleIds;
        } else {
          this.idsMisAutos = [];
        }
      },
      error: (err) => {
        const mensaje =
          err?.error?.message || 'Error al obtener tus vehículos.';
        if (mensaje === 'No se encontraron vehículos para este usuario') {
          this.idsMisAutos = [];
        } else {
          console.warn(mensaje);
        }
      },
    });
  }

  getCarsSeminuevos() {
    this.carsService.getCarsSeminuevos().subscribe({
      next: (res: any) => {
        const autos = res?.coches || []
        // 🔍 Solo ocultar pendientes si mostrarPendientes es FALSE
        const autosFiltrados = this.mostrarPendientes
          ? autos
          : autos.filter((auto: any) => auto.estadoPublicacion !== 'pendiente');
        // console.log('MOSTRAR = ',this.mostrarPendientes)

        this.autosStorage = autosFiltrados.map((auto: any) => {
          const precios = auto.version?.map((v: any) => v.Precio) || [];
          const precioDesde = Math.min(...precios);
          const precioHasta = Math.max(...precios);

          return {
            ...auto,
            estadoVehiculo: auto.estadoVehiculo || 'disponible',
            imagen: auto.imagenPrincipal || '/assets/default-car.webp',
            precioDesde,
            precioHasta,
          };
        });

        this.totalAutos = this.autosStorage.length;
        this.getCarsFavoritos();
        this.calcularPaginacion();
        this.misAutos();
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('Error al guardar los datos', mensaje);
      },
    });
  }

  // ## ----- Ver descripción de aúto
  async ficha(auto: any) {
    localStorage.setItem('autoFicha', JSON.stringify(auto));
    this.router.navigate(['/ficha', auto._id]);
  }

  // ## ----- Calculación de paginación
  calcularPaginacion() {
    this.totalPaginas = Math.ceil(
      this.autosStorage.length / this.itemsPorPagina
    );
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.mostrarPagina(this.paginaActual);
  }

  mostrarPagina(pagina: number) {
    this.paginaActual = pagina;

    const base = this.autosFiltrados.length
      ? this.autosFiltrados
      : [...this.autosStorage];

    const inicio = (pagina - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;

    this.autosPaginados = base.slice(inicio, fin);
  }

  doRefresh(event: any) {
    this.getCarsSeminuevos();
    this.filtrosAplicados = {};

    setTimeout(() => {
      event.target.complete();
    }, 1500);
  }
  getCarsFavoritos() {
    this.carsService.getCarsFavoritos().subscribe({
      next: (res: any) => {
        const vehicleIds = res.vehicles.map(
          (vehicle: any) => vehicle.vehicleId
        );
        this.autosFavoritosIds = new Set(vehicleIds);
        this.mostrarPagina(this.paginaActual);
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        // this.generalService.alert(
        //   'Error al cargar favoritos',
        //   mensaje,
        //   'danger'
        // );
      },
    });
  }

  // ## ----- Filtro ☢️☢️☢️☢️
  async mostrarOpciones(ev: Event, tipo: string) {
    const popover = await this.popoverCtrl.create({
      component: ListComponent,
      event: ev,
      translucent: true,
      componentProps: { tipo },
    });

    await popover.present();
    const { data } = await popover.onDidDismiss();

    if (data === null) {
      // Se seleccionó "Quitar filtro"
      this.filtrosAplicados[tipo] = null;
    } else {
      this.filtrosAplicados[tipo] = data;
    }

    this.aplicarFiltros();
  }

  // ## ----- ☢️☢️☢️☢️
  aplicarFiltros() {
    let autosFiltrados = [...this.autosStorage];

    const { precio, anio, color, marca, tipo} = this.filtrosAplicados;

    if (precio) {
      autosFiltrados = autosFiltrados.filter(
        (auto) =>
          auto.precioDesde >= precio.rango[0] &&
          auto.precioDesde <= precio.rango[1]
      );
    }

    if (anio) {
      autosFiltrados = autosFiltrados.filter((auto) => auto.anio === anio.anio);
    }

    if (color) {
      autosFiltrados = autosFiltrados.filter(
        (auto) => auto.color?.toLowerCase() === color.label.toLowerCase()
      );
    }

    if (marca) {
      autosFiltrados = autosFiltrados.filter(
        (auto) => auto.marca.toLowerCase() === marca.label.toLowerCase()
      );
    }

    if (tipo) {
      autosFiltrados = autosFiltrados.filter(
        (auto) => auto.tipoVehiculo?.toLowerCase() === tipo.label.toLowerCase()
      );
    }

    this.autosFiltrados = autosFiltrados;
    this.totalPaginas = Math.ceil(autosFiltrados.length / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.autosPaginados = autosFiltrados.slice(0, this.itemsPorPagina);
  }

  async agregarAFavoritos(autoId: string) {
    if (!this.isLoggedIn) {
      this.router.navigate(['/inicio']);
      this.generalService.alert(
        'Inicia sesión',
        'Debes iniciar sesión para poder agregar este vehículo a tus favoritos.',
        'info'
      );
      return;
    }

    // Mostrar spinner
    await this.generalService.loading('Agregando a favoritos...');

    this.carsService.agregarFavorito(autoId).subscribe({
      next: async () => {
        this.getCarsSeminuevos();
        await this.generalService.loadingDismiss();
      },
      error: async (err) => {
        await this.generalService.loadingDismiss();
        const mensaje =
          err.error?.message ||
          'No se pudo agregar el auto a favoritos. Intenta más tarde.';
        await this.generalService.alert('Error', mensaje, 'danger');
      },
    });
  }
  handleRefrescarAutos(ubicacion: string) {
    if (ubicacion === 'seminuevos') {
      this.getCarsSeminuevos();
    }
  }

  ordenarAutos(criterio: string) {
    this.ordenActivo = criterio;
    const base = this.autosFiltrados.length
      ? this.autosFiltrados
      : [...this.autosStorage];

    switch (criterio) {
      case 'precioAsc':
        base.sort((a, b) => a.precioDesde - b.precioDesde);
        break;
      case 'precioDesc':
        base.sort((a, b) => b.precioDesde - a.precioDesde);
        break;
      default:
        base.sort((a, b) => b.anio - a.anio);
        break;
    }

    this.autosFiltrados = base;
    this.totalPaginas = Math.ceil(base.length / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.autosPaginados = base.slice(0, this.itemsPorPagina);
  }

  resetearFiltros() {
    this.filtrosAplicados = {};
    this.aplicarFiltros();
  }

  cambiarPagina(pagina: number) {
    this.mostrarPagina(pagina);

    // @ViewChild('pageContent') content!: IonContent;

    setTimeout(() => {
      this.content.scrollToTop(400);
    }, 100);
  }

  esNumero(valor: any): valor is number {
    return typeof valor === 'number';
  }

  get paginasReducidas(): (number | string)[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;
    const rango = 1; // ±2 alrededor

    if (total <= 2) return this.paginas;

    const paginas: (number | string)[] = [];

    paginas.push(1);

    if (actual - rango > 2) paginas.push('...');
    for (
      let i = Math.max(2, actual - rango);
      i <= Math.min(total - 1, actual + rango);
      i++
    ) {
      paginas.push(i);
    }
    if (actual + rango < total - 1) paginas.push('...');
    paginas.push(total);

    return paginas;
  }
}
