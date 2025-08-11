import { Component, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { GeneralService } from '../../services/general.service';
import { CarsService } from '../../services/cars.service';
import { PopoverController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';

import { IonContent } from '@ionic/angular';
import { ViewChild } from '@angular/core';

@Component({
  selector: 'app-faviritos',
  templateUrl: './faviritos.page.html',
  styleUrls: ['./faviritos.page.scss'],
  standalone: false,
})
export class FaviritosPage implements OnInit {
  autosFavoritos: any[] = [];
  public autosFavoritosFiltrados: any[] = [];
  public totalVehiculos: number = 0;
  public idsMisAutos: string[] = [];
  itemsPorPagina!: number;

  autosPaginados: any[] = [];
  paginaActual = 1;
  elementosPorPagina!: number;
  paginas: number[] = [];
  totalPaginas = 0;
  autosFavoritosIds: Set<string> = new Set();

  public isLoggedIn: boolean = false;

  @ViewChild('pageContent') content!: IonContent;
  @ViewChild('pageContent', { static: false }) pageContent!: IonContent;

  constructor(
    private menu: MenuController,
    public generalService: GeneralService,
    private popoverCtrl: PopoverController,
    public carsService: CarsService,
    private modalCtrl: ModalController,
    private router: Router
  ) {}

  ngOnInit() {
    this.generalService.valorGlobal$.subscribe((valor) => {
      this.itemsPorPagina = valor;
    });
    this.generalService.valorGlobal$.subscribe((valor) => {
      this.itemsPorPagina = valor;
    });
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    this.getCarsFavoritos();
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
  ngAfterViewInit() {
    this.getCarsFavoritos();
  }
  getCarsFavoritos() {
    this.carsService.getCarsFavoritos_all().subscribe({
      next: (res: any[]) => {
        console.log('Autos favoritos obtenidos:', res);

        this.autosFavoritos = res;
        this.autosFavoritosFiltrados = [...res];
        // console.log('FILTRADA:', this.autosFavoritosFiltrados);
        this.totalVehiculos = this.autosFavoritos.length;
        this.calcularPaginacion();
        // this.getCarsFavoritosID();
        this.misAutosid();
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        console.warn(mensaje);
        if (mensaje === 'No hay vehículos en la lista de deseos') {
          this.autosFavoritos = [];
          this.autosPaginados = [];
          this.totalVehiculos = 0;
          this.paginas = [];
          this.totalPaginas = 0;
        }
      },
    });
  }
  calcularPaginacion() {
    const total = this.autosFavoritosFiltrados.length;
    this.totalPaginas = Math.ceil(total / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.paginaActual = 1;
    this.actualizarMotosPaginadas();
  }
  actualizarMotosPaginadas() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.autosPaginados = this.autosFavoritosFiltrados.slice(inicio, fin);
  }
  cambiarPagina(pagina: number) {
    this.paginaActual = pagina;
    this.actualizarMotosPaginadas();
    setTimeout(() => {
      this.pageContent?.scrollToTop(400);
    }, 100);
  }
  misAutosid() {
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
  handleRefrescarAutos(ubicacion: string) {
    this.getCarsFavoritos();
  }
  ordenarAutos(criterio: string) {
    if (
      !this.autosFavoritosFiltrados ||
      this.autosFavoritosFiltrados.length === 0
    )
      return;

    const obtenerPrecio = (auto: any): number => {
      if (Array.isArray(auto.version) && auto.version.length > 1) {
        // Carro nuevo (varias versiones) → menor precio
        return Math.min(...auto.version.map((v: any) => v.Precio));
      } else if (Array.isArray(auto.version) && auto.version.length === 1) {
        // Carro usado/seminuevo
        return auto.version[0]?.Precio || 0;
      } else {
        // Moto u otro tipo con precio directo
        return auto.precio || 0;
      }
    };

    if (criterio === 'precioAsc') {
      this.autosFavoritosFiltrados.sort(
        (a, b) => obtenerPrecio(a) - obtenerPrecio(b)
      );
    } else if (criterio === 'precioDesc') {
      this.autosFavoritosFiltrados.sort(
        (a, b) => obtenerPrecio(b) - obtenerPrecio(a)
      );
    }

    this.paginaActual = 1;
    this.calcularPaginacion();

    setTimeout(() => {
      this.pageContent?.scrollToTop(400);
    }, 100);
  }
  esNumero(valor: any): valor is number {
    return typeof valor === 'number';
  }
  doRefresh(event: any) {
    this.getCarsFavoritos();
    this.generalService.valorGlobal$.subscribe((valor) => {
      this.elementosPorPagina = valor;
    });

    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    this.misAutos();
    
    setTimeout(() => {
      event.target.complete();
    }, 1500);
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
