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
import { MotosService } from '../../../services/motos.service';

interface Auto {
  marca: string;
  modelo: string;
  anio: number;
  tipo: string;
  precio: number;
  imagen: string;
}

@Component({
  selector: 'app-mis-motos',
  templateUrl: './mis-motos.page.html',
  styleUrls: ['./mis-motos.page.scss'],
  standalone: false,
})
export class MisMotosPage implements OnInit {
  autosAmostrar: any[] = [];
  public totalMotos: number = 0;

  public MisMotos: any[] = [];

  idsMisMotos: string[] = [];
  public autosFiltrados: any[] = [];
  autosFavoritosIds: Set<string> = new Set();

  paginaActual: number = 1;
  totalPaginas: number = 1;
  paginas: number[] = [];
  motosPaginadas: any[] = [];
  itemsPorPagina!: number;
  filtros = [
    { label: '$', tipo: 'precio' },
    { label: 'Color', tipo: 'color' },
    // { label: 'Año', tipo: 'anio' },
    { label: 'Marca', tipo: 'marca' },
  ];
  filtrosAplicados: any = {
    precio: null,
    anio: null,
    color: null,
    marca: null,
  };
  @ViewChild('pageContent', { static: false }) pageContent!: IonContent;
  public motosFiltradas: any[] = [];

  constructor(
    public generalService: GeneralService,
    private popoverCtrl: PopoverController,
    public carsService: CarsService,
    private modalCtrl: ModalController,
    private router: Router,
    private route: ActivatedRoute,
    private motosService: MotosService,
    private menuCtrl: MenuController,
  ) {}

  ngOnInit() {
    this.menuCtrl.close('menuLateral');
    this.generalService.valorGlobal$.subscribe((valor) => {
      this.itemsPorPagina = valor;
      this.misMotos();
    });
  }

async misMotos() {
  this.motosService.misMotosId().subscribe({
    next: (res: any) => {
      // Soporta ambas formas: { motos: [...] } o directamente [...]
      const motosArr: any[] =
        Array.isArray(res?.motos) ? res.motos :
        Array.isArray(res) ? res :
        [];

      this.MisMotos = motosArr;
      this.motosFiltradas = [...motosArr];
      this.totalMotos = this.MisMotos.length;

      this.calcularPaginacion();
      this.getCarsFavoritos();
      this.misAutosid();
    },
    error: (err) => {
      const mensaje = err?.error?.message || 'Error al obtener tus vehículos.';
      if (mensaje === 'No se encontraron vehículos para este usuario') {
        this.MisMotos = [];
        this.motosFiltradas = [];
        this.totalMotos = 0;
        this.calcularPaginacion();
      } else {
        console.warn(mensaje);
      }
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
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
      },
    });
  }
  misAutosid() {
    this.carsService.misAutosId().subscribe({
      next: (res: any) => {
        if (res && Array.isArray(res.vehicleIds) && res.vehicleIds.length > 0) {
          this.idsMisMotos = res.vehicleIds;
        } else {
          this.idsMisMotos = [];
        }
      },
      error: (err) => {
        const mensaje =
          err?.error?.message || 'Error al obtener tus vehículos.';
        if (mensaje === 'No se encontraron vehículos para este usuario') {
          this.idsMisMotos = [];
        } else {
          console.warn(mensaje);
        }
      },
    });
  }
  regresar() {
    this.router.navigate(['/home']);
  }
  handleRefrescarAutos(ubicacion: string) {
    this.misMotos();
  }

  calcularPaginacion() {
    const total = this.motosFiltradas.length;
    this.totalPaginas = Math.ceil(total / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.paginaActual = 1;
    this.actualizarMotosPaginadas();
  }
  actualizarMotosPaginadas() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.motosPaginadas = this.motosFiltradas.slice(inicio, fin);
    // console.log(this.motosPaginadas)
  }
  cambiarPagina(pagina: number) {
    this.paginaActual = pagina;
    this.actualizarMotosPaginadas();
    setTimeout(() => {
      this.pageContent?.scrollToTop(400);
    }, 100);
  }
  ordenarAutos(criterio: string) {
    if (!this.MisMotos || this.MisMotos.length === 0) return;

    if (criterio === 'precioAsc') {
      this.motosFiltradas.sort((a, b) => a.precio - b.precio);
    } else if (criterio === 'precioDesc') {
      this.motosFiltradas.sort((a, b) => b.precio - a.precio);
    }

    this.paginaActual = 1;
    this.calcularPaginacion();

    setTimeout(() => {
      this.pageContent?.scrollToTop(400);
    }, 100);
  }
  async mostrarOpciones(ev: Event, tipo: string) {
    const popover = await this.popoverCtrl.create({
      component: ListComponent,
      event: ev,
      translucent: true,
      componentProps: { tipo, extra: 'motos' },
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
  aplicarFiltros() {
    this.motosFiltradas = this.MisMotos.filter((moto) => {
      const filtroPrecio = this.filtrosAplicados.precio;
      const filtroAnio = this.filtrosAplicados.anio;
      const filtroColor = this.filtrosAplicados.color;
      const filtroMarca = this.filtrosAplicados.marca;

      const coincidePrecio =
        !filtroPrecio ||
        (Array.isArray(filtroPrecio.rango) &&
          filtroPrecio.rango.length === 2 &&
          moto.precio >= filtroPrecio.rango[0] &&
          moto.precio <= filtroPrecio.rango[1]);

      const coincideAnio = !filtroAnio || moto.anio === Number(filtroAnio);

      const coincideColor =
        !filtroColor ||
        (Array.isArray(moto.color) &&
          moto.color.some(
            (c: string) =>
              c.toLowerCase().trim() === filtroColor.label.toLowerCase().trim()
          ));

      const coincideMarca =
        !filtroMarca ||
        moto.marca.toLowerCase().trim() ===
          filtroMarca.label.toLowerCase().trim();

      return coincidePrecio && coincideAnio && coincideColor && coincideMarca;
    });

    this.totalMotos = this.motosFiltradas.length;
    this.paginaActual = 1;
    this.calcularPaginacion();
  }
  resetearFiltros() {
    this.filtrosAplicados = {
      precio: null,
      anio: null,
      color: null,
      marca: null,
    };
    this.aplicarFiltros();
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
