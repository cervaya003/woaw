import { Component, OnInit, ViewChild } from '@angular/core';
import { MenuController, PopoverController, ModalController, IonContent } from '@ionic/angular';
import { GeneralService } from '../../../services/general.service';
import { CarsService } from '../../../services/cars.service';
import { RentaService } from '../../../services/renta.service';
import { ListComponent } from '../../../components/filtos/list/list.component';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-mis-autos',
  templateUrl: './mis-autos.page.html',
  styleUrls: ['./mis-autos.page.scss'],
  standalone: false,
})
export class MisAutosPage implements OnInit {
  @ViewChild('pageContent') content!: IonContent;

  esDispositivoMovil = false;

  // Segmento activo
  vistaActiva: 'venta' | 'renta' = 'venta';

  // ==== Venta
  autosVentaStorage: any[] = [];
  autosVentaFiltrados: any[] = [];
  autosVentaPaginados: any[] = [];
  totalAutosVenta = 0;
  paginaVentaActual = 1;
  totalPaginasVenta = 1;
  paginasVenta: number[] = [];

  // ==== Renta
  autosRentaStorage: any[] = [];
  autosRentaFiltrados: any[] = [];
  autosRentaPaginados: any[] = [];
  totalAutosRenta = 0;
  paginaRentaActual = 1;
  totalPaginasRenta = 1;
  paginasRenta: number[] = [];

  // Filtros/estado global
  filtros = [
    { label: '$', tipo: 'precio' },
    { label: 'Marca', tipo: 'marca' },
  ];
  filtrosAplicados: any = { precio: null, anio: null, color: null, marca: null };
  terminoBusqueda = '';
  ordenActivo: string | null = null;

  // Sesión
  isLoggedIn = false;
  MyRole: string | null = null;

  autosFavoritosIds: Set<string> = new Set();
  // Valor por defecto seguro para evitar NaN en la paginación
  itemsPorPagina: number = 12;

  idsMisAutos: string[] = []; // IDs de venta (para [esMio])

  constructor(
    public generalService: GeneralService,
    private popoverCtrl: PopoverController,
    public carsService: CarsService,
    private rentaService: RentaService,
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

    // Cuando haya token, entonces pide los IDs de mis autos
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
      if (estado) this.misAutosVentaIds();
    });

    this.generalService.tipoRol$.subscribe((rol) => (this.MyRole = rol));
    this.generalService.valorGlobal$.subscribe((valor) => {
      this.itemsPorPagina = valor || 12; // fallback seguro
      // Recalcular paginaciones cuando cambie el tamaño
      this.calcularPaginacion('venta');
      this.calcularPaginacion('renta');
    });

    // Datos
    this.cargarAutosVenta();
    this.cargarAutosRenta();
  }

  // ==== Getters de totales (cuentan filtrados si existen, si no el storage)
  get totalVenta(): number {
    return this.autosVentaFiltrados.length || this.autosVentaStorage.length;
  }
  get totalRenta(): number {
    return this.autosRentaFiltrados.length || this.autosRentaStorage.length;
  }

  // ====== Cargar datos
  misAutosVentaIds() {
    if (!this.isLoggedIn) return;
    this.carsService.misAutosId().subscribe({
      next: (res: any) => {
        this.idsMisAutos = Array.isArray(res?.vehicleIds) ? res.vehicleIds : [];
      },
      error: () => (this.idsMisAutos = []),
    });
  }

  cargarAutosVenta() {
    this.carsService.getMyCars().subscribe({
      next: (res: any[]) => {
        this.autosVentaStorage = (res || []).map((auto: any) => {
          const precios = auto.version?.map((v: any) => v.Precio) || [];
          const precioDesde = precios.length ? Math.min(...precios) : 0;
          const precioHasta = precios.length ? Math.max(...precios) : 0;
          return {
            ...auto,
            estadoVehiculo: auto.estadoVehiculo || 'disponible',
            imagen: auto.imagenPrincipal || '/assets/default-car.webp',
            precioDesde,
            precioHasta,
          };
        });
        this.totalAutosVenta = this.autosVentaStorage.length;
        this.getCarsFavoritos(); // mantiene favoritos para venta
        this.aplicarFiltros();   // aplica sobre el segmento activo
      },
      error: () => { },
    });
  }

  cargarAutosRenta() {
    this.rentaService.misCoches().subscribe({
      next: (res: any[]) => {
        // Normaliza renta para reutilizar app-cartas
        this.autosRentaStorage = (res || []).map((r: any) => {
          const porDia = r.precio?.porDia ?? r.precioPorDia ?? 0;
          const imagen = r.imagenPrincipal || r.imagenPrincipalUrl || '/assets/default-car.webp';
          return {
            ...r,
            imagen,
            precioDesde: porDia, // usamos porDia como base
            precioHasta: porDia,
            estadoVehiculo: r.estadoRenta || 'disponible',
          };
        });
        this.totalAutosRenta = this.autosRentaStorage.length;
        this.aplicarFiltros();
      },
      error: () => { },
    });
  }

  getCarsFavoritos() {
    this.carsService.getCarsFavoritos().subscribe({
      next: (res: any) => {
        const vehicleIds = (res?.vehicles || []).map((v: any) => v.vehicleId);
        this.autosFavoritosIds = new Set(vehicleIds);
        this.aplicarFiltros();
      },
      error: () => { },
    });
  }

  // ====== UI
  onSegmentChange() {
    // Reinicia búsqueda/paginación al cambiar
    this.paginaVentaActual = 1;
    this.paginaRentaActual = 1;
    this.aplicarFiltros();
    setTimeout(() => this.content?.scrollToTop(300), 50);
  }

  doRefresh(event: any) {
    this.cargarAutosVenta();
    this.cargarAutosRenta();
    this.filtrosAplicados = {};
    setTimeout(() => event.target.complete(), 1200);
  }

  regresar() {
    this.router.navigate(['/home']);
  }

  // ====== Filtros / Búsqueda / Orden
  async mostrarOpciones(ev: Event, tipo: string) {
    const popover = await this.popoverCtrl.create({
      component: ListComponent,
      event: ev,
      translucent: true,
      componentProps: { tipo },
    });
    await popover.present();
    const { data } = await popover.onDidDismiss();

    this.filtrosAplicados[tipo] = (data === null) ? null : data;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    const source = this.vistaActiva === 'venta' ? this.autosVentaStorage : this.autosRentaStorage;
    let lista = [...source];

    const { precio, anio, color, marca } = this.filtrosAplicados;

    // Precio defensivo: espera { rango: [min, max] }
    if (precio?.rango?.length === 2) {
      const [min, max] = precio.rango;
      lista = lista.filter(
        (a) => Number(a.precioDesde) >= min && Number(a.precioDesde) <= max
      );
    }

    if (anio) {
      if (anio.anio === 2024) lista = lista.filter((a) => a.anio >= 2024);
      else if (anio.anio === 2020) lista = lista.filter((a) => a.anio >= 2020 && a.anio <= 2023);
      else if (anio.anio === 2010) lista = lista.filter((a) => a.anio < 2020);
    }
    if (color) {
      lista = lista.filter((a) => (a.color || '').toLowerCase() === String(color.label || color).toLowerCase());
    }
    if (marca) {
      lista = lista.filter((a) => (a.marca || '').toLowerCase() === String(marca.label || marca).toLowerCase());
    }

    if (this.vistaActiva === 'venta') {
      this.autosVentaFiltrados = lista;
      this.calcularPaginacion('venta');
    } else {
      this.autosRentaFiltrados = lista;
      this.calcularPaginacion('renta');
    }
  }

  filtrarPorBusqueda() {
    const termino = this.terminoBusqueda.trim().toLowerCase();
    const base = this.vistaActiva === 'venta'
      ? (this.autosVentaFiltrados.length ? this.autosVentaFiltrados : this.autosVentaStorage)
      : (this.autosRentaFiltrados.length ? this.autosRentaFiltrados : this.autosRentaStorage);

    if (!termino) {
      this.aplicarFiltros();
      return;
    }

    const filtrados = base.filter((auto: any) => {
      const marca = (auto.marca || '').toLowerCase();
      const modelo = (auto.modelo || '').toLowerCase();
      const anio = String(auto.anio || '');
      const versiones = (auto.version || []).map((v: any) => (v.Name || '').toLowerCase()).join(' ');
      return marca.includes(termino) || modelo.includes(termino) || anio.includes(termino) || versiones.includes(termino);
    });

    const porPagina = this.itemsPorPagina || 12;

    if (this.vistaActiva === 'venta') {
      this.totalPaginasVenta = Math.ceil(filtrados.length / porPagina);
      this.paginasVenta = Array.from({ length: this.totalPaginasVenta }, (_, i) => i + 1);
      this.paginaVentaActual = 1;
      this.autosVentaPaginados = filtrados.slice(0, porPagina);
    } else {
      this.totalPaginasRenta = Math.ceil(filtrados.length / porPagina);
      this.paginasRenta = Array.from({ length: this.totalPaginasRenta }, (_, i) => i + 1);
      this.paginaRentaActual = 1;
      this.autosRentaPaginados = filtrados.slice(0, porPagina);
    }
  }

  ordenarAutos(criterio: string) {
    this.ordenActivo = criterio;

    const base = this.vistaActiva === 'venta'
      ? (this.autosVentaFiltrados.length ? [...this.autosVentaFiltrados] : [...this.autosVentaStorage])
      : (this.autosRentaFiltrados.length ? [...this.autosRentaFiltrados] : [...this.autosRentaStorage]);

    switch (criterio) {
      case 'precioAsc': base.sort((a, b) => (a.precioDesde ?? Infinity) - (b.precioDesde ?? Infinity)); break;
      case 'precioDesc': base.sort((a, b) => (b.precioDesde ?? -1) - (a.precioDesde ?? -1)); break;
      default: base.sort((a, b) => (b.anio ?? 0) - (a.anio ?? 0)); break;
    }

    const porPagina = this.itemsPorPagina || 12;

    if (this.vistaActiva === 'venta') {
      this.autosVentaFiltrados = base;
      this.totalPaginasVenta = Math.ceil(base.length / porPagina);
      this.paginasVenta = Array.from({ length: this.totalPaginasVenta }, (_, i) => i + 1);
      this.autosVentaPaginados = base.slice(0, porPagina);
    } else {
      this.autosRentaFiltrados = base;
      this.totalPaginasRenta = Math.ceil(base.length / porPagina);
      this.paginasRenta = Array.from({ length: this.totalPaginasRenta }, (_, i) => i + 1);
      this.autosRentaPaginados = base.slice(0, porPagina);
    }
  }

  resetearFiltros() {
    this.filtrosAplicados = {};
    this.aplicarFiltros();
  }

  // ====== Paginación
  calcularPaginacion(segmento: 'venta' | 'renta') {
    const base = segmento === 'venta'
      ? (this.autosVentaFiltrados.length ? this.autosVentaFiltrados : this.autosVentaStorage)
      : (this.autosRentaFiltrados.length ? this.autosRentaFiltrados : this.autosRentaStorage);

    const porPagina = this.itemsPorPagina || 12;
    const totalPag = Math.max(1, Math.ceil(base.length / porPagina));

    if (segmento === 'venta') {
      this.totalPaginasVenta = totalPag;
      this.paginasVenta = Array.from({ length: totalPag }, (_, i) => i + 1);
      this.mostrarPagina('venta', this.paginaVentaActual);
    } else {
      this.totalPaginasRenta = totalPag;
      this.paginasRenta = Array.from({ length: totalPag }, (_, i) => i + 1);
      this.mostrarPagina('renta', this.paginaRentaActual);
    }
  }

  mostrarPagina(segmento: 'venta' | 'renta', pagina: number) {
    const base = segmento === 'venta'
      ? (this.autosVentaFiltrados.length ? this.autosVentaFiltrados : this.autosVentaStorage)
      : (this.autosRentaFiltrados.length ? this.autosRentaFiltrados : this.autosRentaStorage);

    const porPagina = this.itemsPorPagina || 12;
    const totalPag = segmento === 'venta' ? this.totalPaginasVenta : this.totalPaginasRenta;

    const pagSan = Math.min(Math.max(1, pagina), totalPag);
    const inicio = (pagSan - 1) * porPagina;
    const fin = inicio + porPagina;
    const slice = base.slice(inicio, fin);

    if (segmento === 'venta') {
      this.paginaVentaActual = pagSan;
      this.autosVentaPaginados = slice;
    } else {
      this.paginaRentaActual = pagSan;
      this.autosRentaPaginados = slice;
    }
  }

  cambiarPagina(segmento: 'venta' | 'renta', pagina: number) {
    this.mostrarPagina(segmento, pagina);
    setTimeout(() => this.content.scrollToTop(400), 100);
  }

  // Helpers UI
  esNumero(valor: any): valor is number { return typeof valor === 'number'; }

  get paginasReducidasVenta(): (number | string)[] {
    const total = this.totalPaginasVenta, actual = this.paginaVentaActual, rango = 1;
    if (total <= 2) return this.paginasVenta;
    const arr: (number | string)[] = [1];
    if (actual - rango > 2) arr.push('...');
    for (let i = Math.max(2, actual - rango); i <= Math.min(total - 1, actual + rango); i++) arr.push(i);
    if (actual + rango < total - 1) arr.push('...');
    arr.push(total);
    return arr;
  }

  get paginasReducidasRenta(): (number | string)[] {
    const total = this.totalPaginasRenta, actual = this.paginaRentaActual, rango = 1;
    if (total <= 2) return this.paginasRenta;
    const arr: (number | string)[] = [1];
    if (actual - rango > 2) arr.push('...');
    for (let i = Math.max(2, actual - rango); i <= Math.min(total - 1, actual + rango); i++) arr.push(i);
    if (actual + rango < total - 1) arr.push('...');
    arr.push(total);
    return arr;
  }

  // trackBy para listas
  trackById = (_: number, a: any) => a?._id || _;
}
