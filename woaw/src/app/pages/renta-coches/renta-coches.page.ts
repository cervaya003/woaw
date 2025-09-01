import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { IonContent, PopoverController } from '@ionic/angular';
import { Router } from '@angular/router';
import { RentaService } from '../../services/renta.service';
import { ListComponent } from '../../components/filtos/list/list.component';

// Ahora permitimos string para evitar choques de tipos con la plantilla
type NumOrDots = number | string;
type Segmento = 'todos' | 'mios';

@Component({
  selector: 'app-renta-coches',
  templateUrl: './renta-coches.page.html',
  styleUrls: ['./renta-coches.page.scss'],
  standalone: false,
})
export class RentaCochesPage implements OnInit, OnDestroy {
  @ViewChild('pageContent', { static: false }) pageContent!: IonContent;

  // ===== Sesión simple (si hay token)
  get isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // ===== Segmento activo
  vistaActiva: Segmento = 'todos';

  // ====== TODOS (público)
  todosStorage: any[] = [];
  todosFiltrados: any[] = [];
  todosPaginados: any[] = [];
  totalTodos = 0;
  paginaTodosActual = 1;
  totalPaginasTodos = 1;

  // ====== MIS AUTOS (requiere token)
  miosStorage: any[] = [];
  miosFiltrados: any[] = [];
  miosPaginados: any[] = [];
  totalMios = 0;
  paginaMiosActual = 1;
  totalPaginasMios = 1;

  // ===== UI / comunes
  loading = false;
  error: string | null = null;
  readonly itemsPorPagina = 12;
  ordenActual: 'precioAsc' | 'precioDesc' | 'recientes' | '' = '';

  // ===== Filtros (compatibles con tu ListComponent)
  filtros = [
    { label: '$', tipo: 'precio' },
    { label: 'Color', tipo: 'color' },
    { label: 'Marca', tipo: 'marca' },
    // { label: 'Año', tipo: 'anio' },
  ];
  filtrosAplicados: any = { precio: null, anio: null, color: null, marca: null };

  private lastPopover?: HTMLIonPopoverElement | null;

  constructor(
    private rentaService: RentaService,
    private popoverCtrl: PopoverController,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargarTodos();
    this.cargarMios(); // si no hay token, ignora silenciosamente
  }

  ngOnDestroy(): void {
    this.lastPopover?.dismiss().catch(() => {});
    this.lastPopover = null;
  }

  // ========= DATA =========
  private cargarTodos() {
    this.loading = true;
    this.error = null;

    this.rentaService.listarCoches().subscribe({
      next: (res) => {
        const items = Array.isArray(res) ? res : (res?.rentals ?? res?.docs ?? res?.data ?? []);
        this.todosStorage = items || [];
        this.totalTodos = this.todosStorage.length;
        this.aplicarFiltros();
        this.ordenarAutos('recientes');
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error al cargar coches';
        this.todosStorage = [];
        this.totalTodos = 0;
        this.aplicarFiltros();
        this.loading = false;
      },
    });
  }

  private cargarMios() {
    if (!this.isLoggedIn) {
      this.miosStorage = [];
      this.totalMios = 0;
      return;
    }
    this.rentaService.misCoches().subscribe({
      next: (res) => {
        const items = Array.isArray(res) ? res : (res?.docs ?? res?.data ?? res?.rentals ?? []);
        this.miosStorage = items || [];
        this.totalMios = this.miosStorage.length;
        this.aplicarFiltros();
      },
      error: () => {
        this.miosStorage = [];
        this.totalMios = 0;
      },
    });
  }

  // ========= SEGMENTO / ORDEN =========
  onSegmentChange() {
    if (this.vistaActiva === 'todos') this.paginaTodosActual = 1;
    else this.paginaMiosActual = 1;
    this.aplicarFiltros();
    setTimeout(() => this.pageContent?.scrollToTop(300), 50);
  }

  // Acepta string para lo que emita <app-acomodo>
  ordenarAutos(criterio: 'precioAsc' | 'precioDesc' | 'recientes' | '' | string) {
    const c = (criterio ?? '').toString() as 'precioAsc' | 'precioDesc' | 'recientes' | '';
    this.ordenActual = c;

    const base =
      this.vistaActiva === 'todos'
        ? (this.todosFiltrados.length ? this.todosFiltrados : [...this.todosStorage])
        : (this.miosFiltrados.length ? this.miosFiltrados : [...this.miosStorage]);

    if (c === 'precioAsc') {
      base.sort((a, b) => (a?.precio?.porDia ?? 0) - (b?.precio?.porDia ?? 0));
    } else if (c === 'precioDesc') {
      base.sort((a, b) => (b?.precio?.porDia ?? 0) - (a?.precio?.porDia ?? 0));
    } else if (c === 'recientes') {
      base.sort((a, b) => +new Date(b?.createdAt || 0) - +new Date(a?.createdAt || 0));
    }

    if (this.vistaActiva === 'todos') {
      this.todosFiltrados = base;
      this.calcularPaginacion('todos');
    } else {
      this.miosFiltrados = base;
      this.calcularPaginacion('mios');
    }

    setTimeout(() => this.pageContent?.scrollToTop(300), 50);
  }

  // ========= FILTROS =========
  async mostrarOpciones(ev: Event, tipo: string) {
    await this.lastPopover?.dismiss().catch(() => {});
    this.lastPopover = await this.popoverCtrl.create({
      component: ListComponent,
      event: ev,
      translucent: true,
      componentProps: { tipo, extra: 'renta' },
    });

    await this.lastPopover.present();
    const { data, role } = await this.lastPopover.onDidDismiss();
    this.lastPopover = null;

    if (role === 'cancel' || role === 'backdrop') return;

    this.filtrosAplicados[tipo] = data === null ? null : data;
    this.aplicarFiltros();
  }

  resetearFiltros() {
    this.filtrosAplicados = { precio: null, anio: null, color: null, marca: null };
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    const base = this.vistaActiva === 'todos' ? this.todosStorage : this.miosStorage;
    let lista = [...base];

    const { precio, anio, color, marca } = this.filtrosAplicados;

    // precio por día
    if (precio?.rango?.length === 2) {
      const [min, max] = precio.rango.map((n: any) => Number(n));
      lista = lista.filter(
        (c) => (c?.precio?.porDia ?? 0) >= min && (c?.precio?.porDia ?? 0) <= max
      );
    }

    // año exacto (si habilitas el chip de año)
    if (anio) lista = lista.filter((c) => Number(c?.anio) === Number(anio));

    // color
    if (color) {
      const cf = (color?.label || color).toString().toLowerCase().trim();
      lista = lista.filter(
        (c) => (c?.color || '').toString().toLowerCase().trim() === cf
      );
    }

    // marca
    if (marca) {
      const mf = (marca?.label || marca).toString().toLowerCase().trim();
      lista = lista.filter(
        (c) => (c?.marca || '').toString().toLowerCase().trim() === mf
      );
    }

    if (this.vistaActiva === 'todos') {
      this.todosFiltrados = lista;
      this.totalTodos = this.todosFiltrados.length;
      this.calcularPaginacion('todos');
    } else {
      this.miosFiltrados = lista;
      this.totalMios = this.miosFiltrados.length;
      this.calcularPaginacion('mios');
    }
  }

  // ========= PAGINACIÓN =========
  calcularPaginacion(seg: Segmento) {
    const base =
      seg === 'todos'
        ? this.todosFiltrados.length
          ? this.todosFiltrados
          : this.todosStorage
        : this.miosFiltrados.length
          ? this.miosFiltrados
          : this.miosStorage;

    const totalPag = Math.max(1, Math.ceil(base.length / this.itemsPorPagina));

    if (seg === 'todos') {
      this.totalPaginasTodos = totalPag;
      this.mostrarPagina('todos', this.paginaTodosActual);
    } else {
      this.totalPaginasMios = totalPag;
      this.mostrarPagina('mios', this.paginaMiosActual);
    }
  }

  mostrarPagina(seg: Segmento, pagina: number) {
    const base =
      seg === 'todos'
        ? this.todosFiltrados.length
          ? this.todosFiltrados
          : this.todosStorage
        : this.miosFiltrados.length
          ? this.miosFiltrados
          : this.miosStorage;

    const totalPag = seg === 'todos' ? this.totalPaginasTodos : this.totalPaginasMios;
    const pagSan = Math.min(Math.max(1, pagina), totalPag);
    const inicio = (pagSan - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    const slice = base.slice(inicio, fin);

    if (seg === 'todos') {
      this.paginaTodosActual = pagSan;
      this.todosPaginados = slice;
    } else {
      this.paginaMiosActual = pagSan;
      this.miosPaginados = slice;
    }
  }

  // acepta number | string desde el template
  cambiarPagina(seg: Segmento, pagina: number | string) {
    const p = typeof pagina === 'number' ? pagina : Number(pagina);
    if (!Number.isFinite(p)) return;
    this.mostrarPagina(seg, p);
    setTimeout(() => this.pageContent?.scrollToTop(400), 100);
  }

  // ========= Helpers paginación reducida =========
  get paginasReducidasTodos(): NumOrDots[] {
    return this.buildPaginasReducidas(this.paginaTodosActual, this.totalPaginasTodos);
  }
  get paginasReducidasMios(): NumOrDots[] {
    return this.buildPaginasReducidas(this.paginaMiosActual, this.totalPaginasMios);
  }
  esNumero(v: NumOrDots): v is number {
    return typeof v === 'number';
  }
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

  // ========= Navegación =========
  irADetalle(id: string) {
    this.router.navigate(['/renta-ficha', id]);
  }
}
