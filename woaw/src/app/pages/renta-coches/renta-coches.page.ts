import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent, PopoverController } from '@ionic/angular';
import { RentaService } from '../../services/renta.service';
import { ListComponent } from '../../components/filtos/list/list.component';
import { Router } from '@angular/router';

type NumOrDots = number | '...';

@Component({
  selector: 'app-renta-coches',
  templateUrl: './renta-coches.page.html',
  styleUrls: ['./renta-coches.page.scss'],
  standalone: false
})
export class RentaCochesPage implements OnInit {
  // Datos
  coches: any[] = [];
  cochesFiltrados: any[] = [];
  cochesPaginados: any[] = [];
  totalCoches = 0;

  // UI
  loading = false;
  error: string | null = null;
  @ViewChild('pageContent', { static: false }) pageContent!: IonContent;

  // Filtros (igual patrón que "motos")
  filtros = [
    { label: '$', tipo: 'precio' },
    { label: 'Color', tipo: 'color' },
    { label: 'Marca', tipo: 'marca' },
    // { label: 'Año', tipo: 'anio' },
  ];

  filtrosAplicados: any = {
    precio: null,
    anio: null,
    color: null,
    marca: null,
  };

  // Orden
  ordenActual: 'precioAsc' | 'precioDesc' | 'recientes' | '' = '';

  // Paginación (cliente)
  paginaActual = 1;
  totalPaginas = 1;
  paginasReducidas: NumOrDots[] = [];
  readonly itemsPorPagina = 12;

  constructor(
    private rentaService: RentaService,
    private popoverCtrl: PopoverController,
    private router: Router
  ) { }

  ngOnInit() {
    this.obtenerCoches();
  }

  // ===== DATA =====
  obtenerCoches() {
    this.loading = true;
    this.error = null;

    this.rentaService.listarCoches().subscribe({
      next: (res) => {
        const items = Array.isArray(res) ? res : (res?.rentals ?? res?.docs ?? res?.data ?? []);
        this.coches = items || [];
        this.totalCoches = Array.isArray(items) ? items.length : (res?.contador ?? this.coches.length);

        // Aplica filtros y pagina
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar coches';
        this.coches = [];
        this.cochesFiltrados = [];
        this.cochesPaginados = [];
        this.totalCoches = 0;
        this.paginaActual = 1;
        this.totalPaginas = 1;
        this.paginasReducidas = [1];
        this.loading = false;
        console.error(err);
      }
    });
  }

  // ===== ORDEN =====
  ordenarAutos(criterio: string) {
    this.ordenActual = (criterio as any) || '';

    // Orden en cliente
    if (criterio === 'precioAsc') {
      this.cochesFiltrados.sort((a, b) => (a?.precio?.porDia ?? 0) - (b?.precio?.porDia ?? 0));
    } else if (criterio === 'precioDesc') {
      this.cochesFiltrados.sort((a, b) => (b?.precio?.porDia ?? 0) - (a?.precio?.porDia ?? 0));
    } else if (criterio === 'recientes') {
      this.cochesFiltrados.sort((a, b) => +new Date(b?.createdAt || 0) - +new Date(a?.createdAt || 0));
    }

    this.paginaActual = 1;
    this.calcularPaginacion();
    setTimeout(() => this.pageContent?.scrollToTop(400), 100);
  }

  // ===== FILTROS =====
  async mostrarOpciones(ev: Event, tipo: string) {
    const popover = await this.popoverCtrl.create({
      component: ListComponent,
      event: ev,
      translucent: true,
      componentProps: { tipo, extra: 'renta' } // si tu ListComponent lo distingue
    });

    await popover.present();
    const { data } = await popover.onDidDismiss();

    if (data === null) {
      // Quitar filtro
      this.filtrosAplicados[tipo] = null;
    } else {
      this.filtrosAplicados[tipo] = data; // {label, rango} o string según tu componente
    }

    this.aplicarFiltros();
  }

  aplicarFiltros() {
    const { precio, anio, color, marca } = this.filtrosAplicados;

    this.cochesFiltrados = this.coches.filter((coche) => {
      // precio por día
      const coincidePrecio =
        !precio ||
        (Array.isArray(precio?.rango) &&
          precio.rango.length === 2 &&
          (coche?.precio?.porDia ?? 0) >= precio.rango[0] &&
          (coche?.precio?.porDia ?? 0) <= precio.rango[1]);

      const coincideAnio = !anio || coche.anio === Number(anio);

      const colorCoche = (coche?.color || '').toString().toLowerCase().trim();
      const colorFiltro = (color?.label || color)?.toString().toLowerCase().trim();
      const coincideColor = !color || (!!colorCoche && colorCoche === colorFiltro);

      const marcaCoche = (coche?.marca || '').toString().toLowerCase().trim();
      const marcaFiltro = (marca?.label || marca)?.toString().toLowerCase().trim();
      const coincideMarca = !marca || (!!marcaCoche && marcaCoche === marcaFiltro);

      return coincidePrecio && coincideAnio && coincideColor && coincideMarca;
    });

    this.totalCoches = this.cochesFiltrados.length;
    this.paginaActual = 1;
    this.calcularPaginacion();
  }

  resetearFiltros() {
    this.filtrosAplicados = { precio: null, anio: null, color: null, marca: null };
    this.aplicarFiltros();
  }

  // ===== PAGINACIÓN (cliente) =====
  calcularPaginacion() {
    const total = this.cochesFiltrados.length;
    this.totalPaginas = Math.max(1, Math.ceil(total / this.itemsPorPagina));
    this.cochesPaginados = this.cochesFiltrados.slice(
      (this.paginaActual - 1) * this.itemsPorPagina,
      this.paginaActual * this.itemsPorPagina
    );
    this.paginasReducidas = this.buildPaginasReducidas(this.paginaActual, this.totalPaginas);
  }

  cambiarPagina(num: number) {
    if (num < 1 || num > this.totalPaginas) return;
    this.paginaActual = num;
    this.calcularPaginacion();
    setTimeout(() => this.pageContent?.scrollToTop(400), 100);
  }

  esNumero(v: NumOrDots): v is number { return typeof v === 'number'; }

  private buildPaginasReducidas(actual: number, total: number): NumOrDots[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const res: NumOrDots[] = [1];
    const start = Math.max(2, actual - 1);
    const end = Math.min(total - 1, actual + 1);
    if (start > 2) res.push('...');
    for (let i = start; i <= end; i++) res.push(i);
    if (end < total - 1) res.push('...');
    res.push(total);
    return res;
  }
  irADetalle(id: string) {
    this.router.navigate(['/renta-ficha', id]);
  }
}
