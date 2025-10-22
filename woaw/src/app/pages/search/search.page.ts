// search.page.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CarsService } from '../../services/cars.service';
import { GeneralService } from '../../services/general.service';
import { IonContent } from '@ionic/angular';
import { PopoverController } from '@ionic/angular';
import { ListComponent } from '../../components/filtos/list/list.component';
import { SearchService, SearchResult } from '../../services/search.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: false,
})
export class SearchPage implements OnInit {
  public resultados: any[] = [];
  public resultadosFiltrados: any[] = [];
  public totalVehiculos: number = 0;
  public terminoBusqueda: string = '';
  public tipoBusqueda: string = '';
  @ViewChild('pageContent') content!: IonContent;
  @ViewChild('pageContent', { static: false }) pageContent!: IonContent;
  resultadosPaginados: any[] = [];
  
  // NUEVA VARIABLE - indica si resultadosPaginados tiene datos
  tieneResultadosPaginados: boolean = false;
  
  paginaActual = 1;
  elementosPorPagina!: number;
  paginas: number[] = [];
  totalPaginas = 0;
  autosFavoritosIds: Set<string> = new Set();
  itemsPorPagina!: number;
  idsMisVehiculos: string[] = [];

  // Añade estas propiedades
  serviciosEncontrados: SearchResult[] = [];
  mostrarServicios: boolean = false;

  filtros = [
    { label: 'Precio', tipo: 'precio' },
    { label: 'Color', tipo: 'color' },
  ];
  filtrosAplicados: any = {
    precio: null,
    anio: null,
    color: null,
    marca: null,
  };

  constructor(
    private route: ActivatedRoute,
    private generalService: GeneralService,
    public carsService: CarsService,
    private popoverCtrl: PopoverController,
    private searchService: SearchService,
    private router: Router
  ) { }

  ngOnInit() {
    this.generalService.valorGlobal$.subscribe((valor) => {
      this.itemsPorPagina = valor;
    });
    this.generalService.terminoBusqueda$.subscribe((termino) => {
      if (termino) {
        this.tipoBusqueda = termino;
      }
    });
    this.route.paramMap.subscribe((params) => {
      const termino = params.get('termino');
      if (termino) {
        this.terminoBusqueda = termino;
        this.buscarVehiculos(termino);
        this.buscarServicios(termino);
      }
    });
  }

  // Añade este método
  buscarServicios(termino: string) {
    this.serviciosEncontrados = this.searchService.buscarServicios(termino);

    if (this.serviciosEncontrados && this.serviciosEncontrados.length > 0) {
      this.mostrarServicios = true;
    }
  }

  // Añade este método para navegar a servicios
  navegarAServicio(ruta: string) {
    this.router.navigateByUrl(ruta);
  }

  buscarVehiculos(termino: string) {
    this.carsService.search(termino, this.tipoBusqueda).subscribe({
      next: (res: any) => {
        const autos = res.coches || []
        const contador = res.contador;

        this.resultados = autos;
        this.resultadosFiltrados = [...autos];
        this.totalVehiculos = contador;

        // útil mientras pruebas parser/filtros del back:
        if (res?.debug) console.log('DEBUG filtro back:', res.debug);

        this.calcularPaginacion();
        this.getCarsFavoritos();
        this.misAutosid();
      },
      error: (err) => {
        console.warn('Error en búsqueda:', err);
        this.generalService.alert('Error', 'No se pudo realizar la búsqueda');
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

  calcularPaginacion() {
    const total = this.resultadosFiltrados.length;
    this.totalPaginas = Math.ceil(total / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.paginaActual = 1;
    this.actualizarVihiculosPaginadas();
  }

  actualizarVihiculosPaginadas() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.resultadosPaginados = this.resultadosFiltrados.slice(inicio, fin);
    
    // ACTUALIZAR LA NUEVA VARIABLE - verifica si hay datos
    this.tieneResultadosPaginados = this.resultadosPaginados.length > 0;
  }

  cambiarPagina(pagina: number) {
    this.paginaActual = pagina;
    this.actualizarVihiculosPaginadas();
    setTimeout(() => {
      this.pageContent?.scrollToTop(400);
    }, 100);
  }

  ordenarAutos(criterio: string) {
    if (!this.resultadosFiltrados || this.resultadosFiltrados.length === 0)
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
      this.resultadosFiltrados.sort(
        (a, b) => obtenerPrecio(a) - obtenerPrecio(b)
      );
    } else if (criterio === 'precioDesc') {
      this.resultadosFiltrados.sort(
        (a, b) => obtenerPrecio(b) - obtenerPrecio(a)
      );
    }

    this.paginaActual = 1;
    this.calcularPaginacion();

    setTimeout(() => {
      this.pageContent?.scrollToTop(400);
    }, 100);
  }

  handleRefrescarAutos(ubicacion: string) {
    this.buscarVehiculos(this.terminoBusqueda);
  }

  esNumero(valor: any): valor is number {
    return typeof valor === 'number';
  }

  misAutosid() {
    this.carsService.misAutosId().subscribe({
      next: (res: any) => {
        if (res && Array.isArray(res.vehicleIds) && res.vehicleIds.length > 0) {
          this.idsMisVehiculos = res.vehicleIds;
        } else {
          this.idsMisVehiculos = [];
        }
      },
      error: (err) => {
        const mensaje =
          err?.error?.message || 'Error al obtener tus vehículos.';
        if (mensaje === 'No se encontraron vehículos para este usuario') {
          this.idsMisVehiculos = [];
        } else {
          console.warn(mensaje);
        }
      },
    });
  }

  get paginasReducidas(): (number | string)[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;
    const rango = 1;

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
      this.filtrosAplicados[tipo] = null;
    } else {
      this.filtrosAplicados[tipo] = data;
    }

    this.aplicarFiltros();
  }

  aplicarFiltros() {
    this.resultadosFiltrados = this.resultados.filter((vehiculo) => {
      const filtroPrecio = this.filtrosAplicados.precio;
      const filtroAnio = this.filtrosAplicados.anio;
      const filtroColor = this.filtrosAplicados.color;
      const filtroMarca = this.filtrosAplicados.marca;

      const coincidePrecio =
        !filtroPrecio ||
        (Array.isArray(filtroPrecio.rango) &&
          filtroPrecio.rango.length === 2 &&
          ((Array.isArray(vehiculo.version) &&
            vehiculo.version.some(
              (v: any) =>
                typeof v.Precio === 'number' &&
                v.Precio >= filtroPrecio.rango[0] &&
                v.Precio <= filtroPrecio.rango[1]
            )) ||
            (typeof vehiculo.precio === 'number' &&
              vehiculo.precio >= filtroPrecio.rango[0] &&
              vehiculo.precio <= filtroPrecio.rango[1])));

      const coincideAnio = !filtroAnio || vehiculo.anio === Number(filtroAnio);

      const coincideColor =
        !filtroColor ||
        (Array.isArray(vehiculo.color) &&
          vehiculo.color.some(
            (c: string) =>
              c.toLowerCase().trim() === filtroColor.label.toLowerCase().trim()
          )) ||
        (typeof vehiculo.color === 'string' &&
          vehiculo.color.toLowerCase().trim() ===
          filtroColor.label.toLowerCase().trim());

      const coincideMarca =
        !filtroMarca ||
        vehiculo.marca.toLowerCase().trim() ===
        filtroMarca.label.toLowerCase().trim();

      return coincidePrecio && coincideAnio && coincideColor && coincideMarca;
    });

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
}