import { Component, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { GeneralService } from '../../../services/general.service';
import { CarsService } from '../../../services/cars.service';
import { ListComponent } from '../../../components/filtos/list/list.component';
import { PopoverController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

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
  selector: 'app-mis-autos',
  templateUrl: './mis-autos.page.html',
  styleUrls: ['./mis-autos.page.scss'],
  standalone: false,
})
export class MisAutosPage implements OnInit {
  esDispositivoMovil: boolean = false;
  autosStorage: any[] = [];
  filtros = [
    { label: '$', tipo: 'precio' },
    // { label: 'Color', tipo: 'color' },
    // { label: 'Año', tipo: 'anio' },
    { label: 'Marca', tipo: 'marca' },
  ];

  @ViewChild('pageContent') content!: IonContent;

  ordenActivo: string | null = null;

  public totalAutos: number = 0;

  // ## ----- ☢️☢️☢️☢️
  filtrosAplicados: any = {
    precio: null,
    anio: null,
    color: null,
    marca: null,
  };
  terminoBusqueda: string = '';

  public isLoggedIn: boolean = false;
  public MyRole: string | null = null;

  autosFavoritosIds: Set<string> = new Set();

  // #---
  paginaActual = 1;
  itemsPorPagina!: number;
  totalPaginas = 1;
  paginas: number[] = [];
  autosPaginados: any[] = [];
  // #---

  showSplash: boolean = true;

  public idsMisAutos: string[] = [];

  public autosFiltrados: any[] = [];

  constructor(
    public generalService: GeneralService,
    private popoverCtrl: PopoverController,
    public carsService: CarsService,
    private modalCtrl: ModalController,
    private router: Router,
    private route: ActivatedRoute,
    private menuCtrl: MenuController,
  ) { }

  ngOnInit() {
    this.menuCtrl.close('menuLateral');
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });
    this.getCarsMay();
    // this.calcularPaginacion();

    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });

    this.generalService.tipoRol$.subscribe((rol) => {
      this.MyRole = rol;
    });

    this.generalService.valorGlobal$.subscribe((valor) => {
      this.itemsPorPagina = valor;
    });
    this.misAutos();
  }

  async misAutos() {
    if (!this.isLoggedIn) {
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
  getCarsMay() {
    const token = localStorage.getItem('token');
    // console.log(token);
    this.carsService.getMyCars().subscribe({
      next: (res: any) => {
        this.autosStorage = res.map((auto: any) => {
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
        // console.log(res);
        this.getCarsFavoritos();
        this.calcularPaginacion();
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
      },
    });
  }
  getCarsFavoritos() {
    this.carsService.getCarsFavoritos().subscribe({
      next: (res: any) => {
        const vehicleIds = res.vehicles.map(
          (vehicle: any) => vehicle.vehicleId
        );
        this.autosFavoritosIds = new Set(vehicleIds);
        this.aplicarFiltros();
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
      },
    });
  }
  // ## ----- Ver descripción de aúto
  async ficha(auto: any) {
    // localStorage.setItem('autoFicha', JSON.stringify(auto));
    this.router.navigate(['/ficha', auto._id]);
  }
  doRefresh(event: any) {
    this.getCarsMay();
    this.filtrosAplicados = {};

    setTimeout(() => {
      event.target.complete();
    }, 1500);
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

    const { precio, anio, color, marca } = this.filtrosAplicados;

    if (precio) {
      autosFiltrados = autosFiltrados.filter(
        (auto) =>
          auto.precioDesde >= precio.rango[0] &&
          auto.precioDesde <= precio.rango[1]
      );
    }

    if (anio) {
      if (anio.anio === 2024) {
        autosFiltrados = autosFiltrados.filter((auto) => auto.anio >= 2024);
      } else if (anio.anio === 2020) {
        autosFiltrados = autosFiltrados.filter(
          (auto) => auto.anio >= 2020 && auto.anio <= 2023
        );
      } else if (anio.anio === 2010) {
        autosFiltrados = autosFiltrados.filter((auto) => auto.anio < 2020);
      }
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

    this.autosFiltrados = autosFiltrados;
    this.totalPaginas = Math.ceil(autosFiltrados.length / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.autosPaginados = autosFiltrados.slice(0, this.itemsPorPagina);
  }
  // ## ----- Calculación de paginación 20
  calcularPaginacion() {
    this.totalPaginas = Math.ceil(
      this.autosStorage.length / this.itemsPorPagina
    );
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.mostrarPagina(this.paginaActual);
  }
  mostrarPagina(pagina: number) {
    this.paginaActual = pagina;
    const inicio = (pagina - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.autosPaginados = this.autosStorage.slice(inicio, fin);
  }
  async agregarAFavoritos(autoId: string) {
    if (!this.isLoggedIn) {
      this.router.navigate(['/inicio']);
      this.generalService.alert(
        'Inicia sesión',
        'Por favor, inicia sesión para continuar.',
        'warning'
      );
      return;
    }

    // Mostrar spinner
    await this.generalService.loading('Agregando a favoritos...');

    this.carsService.agregarFavorito(autoId).subscribe({
      next: async () => {
        this.getCarsMay();
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
  regresar() {
    this.router.navigate(['/nuevos']);
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
  filtrarPorBusqueda() {
    const termino = this.terminoBusqueda.trim().toLowerCase();

    // Si no hay texto, mostrar todos los autos
    if (!termino) {
      this.aplicarFiltros();
      return;
    }

    const autosBase = this.autosFiltrados.length ? this.autosFiltrados : this.autosStorage;

    const filtrados = autosBase.filter((auto) => {
      const marca = auto.marca?.toLowerCase() || '';
      const modelo = auto.modelo?.toLowerCase() || '';
      const anio = String(auto.anio || '');
      const versiones = (auto.version || []).map((v: any) => v.Name.toLowerCase()).join(' ');

      return (
        marca.includes(termino) ||
        modelo.includes(termino) ||
        anio.includes(termino) ||
        versiones.includes(termino)
      );
    });

    this.totalPaginas = Math.ceil(filtrados.length / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.paginaActual = 1;
    this.autosPaginados = filtrados.slice(0, this.itemsPorPagina);
  }

}
