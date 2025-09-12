
import { Component, OnInit, ViewChild, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { IonContent, PopoverController } from '@ionic/angular';
import { Router, NavigationStart } from '@angular/router';
import { RentaService } from '../../services/renta.service';
import { ListComponent } from '../../components/filtos/list/list.component';
import { filter } from 'rxjs/operators';
import { GeneralService } from '../../services/general.service';

type NumOrDots = number | string;
type Segmento = 'todos' | 'mios';

@Component({
  selector: 'app-renta-coches',
  templateUrl: './renta-coches.page.html',
  styleUrls: ['./renta-coches.page.scss'],
  standalone: false,

  changeDetection: ChangeDetectionStrategy.Default
})
export class RentaCochesPage implements OnInit, OnDestroy {
  @ViewChild('pageContent', { static: false }) pageContent!: IonContent;

  get isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  private myCarIds = new Set<string>();
  private currentUserId: string | null = null;

  vistaActiva: Segmento = 'todos';

  imgenPrincipal: string = '';

  todosStorage: any[] = [];
  todosFiltrados: any[] = [];
  todosPaginados: any[] = [];
  totalTodos = 0;
  paginaTodosActual = 1;
  totalPaginasTodos = 1;

  miosStorage: any[] = [];
  miosFiltrados: any[] = [];
  miosPaginados: any[] = [];
  totalMios = 0;
  paginaMiosActual = 1;
  totalPaginasMios = 1;

  loading = false;
  error: string | null = null;
  readonly itemsPorPagina = 12;
  ordenActual: 'precioAsc' | 'precioDesc' | 'recientes' | '' = '';

  filtros = [
    { label: '$', tipo: 'precio' },
    { label: 'Color', tipo: 'color' },
    { label: 'Marca', tipo: 'marca' },
  ];
  filtrosAplicados: any = { precio: null, anio: null, color: null, marca: null };

  private lastPopover?: HTMLIonPopoverElement | null;

  // ===== estado del modal propio =====
  modalOpen = false;
  modalCarId: string | null = null;

  // navegación pendiente (se ejecuta cuando el modal termina de cerrarse)
  private pendingNav: any[] | null = null;

  constructor(
    private rentaService: RentaService,
    private popoverCtrl: PopoverController,
    private generalService: GeneralService,
    private router: Router
  ) {
    // Fallback: si empieza cualquier navegación, cerramos/limpiamos el modal
    this.router.events
      .pipe(filter(e => e instanceof NavigationStart))
      .subscribe(() => {
        this.modalOpen = false;
        this.modalCarId = null;
        this.pendingNav = null;
      });
  }

  ngOnInit() {
    this.refreshCurrentUserId();
    this.cargarTodos();
    this.cargarMios();
    this.cargaimagen();
  }

  async cargaimagen() {
    this.imgenPrincipal = '/assets/autos/publicidad/renta.png';
    this.generalService.addPreload(this.imgenPrincipal, 'image');
    try {
      await Promise.all([
        this.generalService.preloadHero(this.imgenPrincipal, 4500),
      ]);
    } finally {
    }
  }

  ngOnDestroy(): void {
    this.lastPopover?.dismiss().catch(() => { });
    this.lastPopover = null;
  }

  private refreshCurrentUserId() {
    try {
      const raw = localStorage.getItem('user');
      const u = raw ? JSON.parse(raw) : null;
      this.currentUserId = u?._id || u?.id || u?.userId || null;
    } catch {
      this.currentUserId = null;
    }
  }
  private cargarTodos() {
    this.loading = true;
    this.error = null;

    this.rentaService.listarCoches().subscribe({
      next: (res) => {
        const items = Array.isArray(res) ? res : (res?.rentals ?? res?.docs ?? res?.data ?? []);

        this.todosStorage = (items || []).filter(
          (x: any) => (x?.estadoRenta ?? 'disponible') !== 'inactivo'
        );
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
    this.refreshCurrentUserId();

    if (!this.isLoggedIn) {
      this.miosStorage = [];
      this.totalMios = 0;
      this.myCarIds.clear();
      return;
    }

    this.rentaService.misCoches().subscribe({
      next: (res) => {
        const items = Array.isArray(res) ? res : (res?.docs ?? res?.data ?? res?.rentals ?? []);
        // ✅ En "mios" NO filtramos inactivos: que aparezcan siempre
        this.miosStorage = items || [];
        this.totalMios = this.miosStorage.length;
        // incluye _id o id para robustez
        this.myCarIds = new Set(this.miosStorage.map((x) => String(x?._id ?? x?.id)).filter(Boolean));
        this.aplicarFiltros();
      },
      error: () => {
        this.miosStorage = [];
        this.totalMios = 0;
        this.myCarIds.clear();
      },
    });
  }

  onSegmentChange() {
    if (this.vistaActiva === 'mios' && this.isLoggedIn && this.miosStorage.length === 0) {
      this.cargarMios();
    }

    if (this.vistaActiva === 'todos') this.paginaTodosActual = 1;
    else this.paginaMiosActual = 1;

    this.aplicarFiltros();
    setTimeout(() => this.pageContent?.scrollToTop(300), 50);
  }

  private createdTs(x: any) {
    const raw = x?.createdAt;
    const t = raw ? new Date(raw).getTime() : NaN;
    return Number.isFinite(t) ? t : 0;
  }

  ordenarAutos(criterio: 'precioAsc' | 'precioDesc' | 'recientes' | '' | string) {
    const c = (criterio ?? '').toString() as 'precioAsc' | 'precioDesc' | 'recientes' | '';
    this.ordenActual = c;

    const base =
      this.vistaActiva === 'todos'
        ? (this.todosFiltrados.length ? [...this.todosFiltrados] : [...this.todosStorage])
        : (this.miosFiltrados.length ? [...this.miosFiltrados] : [...this.miosStorage]);

    if (c === 'precioAsc') {
      base.sort((a, b) => (a?.precio?.porDia ?? 0) - (b?.precio?.porDia ?? 0));
    } else if (c === 'precioDesc') {
      base.sort((a, b) => (b?.precio?.porDia ?? 0) - (a?.precio?.porDia ?? 0));
    } else if (c === 'recientes') {
      base.sort((a, b) => this.createdTs(b) - this.createdTs(a));
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

  async mostrarOpciones(ev: Event, tipo: string) {
    await this.lastPopover?.dismiss().catch(() => { });
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

    if (precio?.rango?.length === 2) {
      const [min, max] = precio.rango.map((n: any) => Number(n));
      lista = lista.filter(
        (c) => (c?.precio?.porDia ?? 0) >= min && (c?.precio?.porDia ?? 0) <= max
      );
    }

    if (anio) lista = lista.filter((c) => Number(c?.anio) === Number(anio));

    if (color) {
      const cf = (color?.label || color).toString().toLowerCase().trim();
      lista = lista.filter(
        (c) => (c?.color || '').toString().toLowerCase().trim() === cf
      );
    }

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


  calcularPaginacion(seg: Segmento) {
    const base =
      seg === 'todos'
        ? (this.todosFiltrados.length ? this.todosFiltrados : this.todosStorage)
        : (this.miosFiltrados.length ? this.miosFiltrados : this.miosStorage);

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
        ? (this.todosFiltrados.length ? this.todosFiltrados : this.todosStorage)
        : (this.miosFiltrados.length ? this.miosFiltrados : this.miosStorage);

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

  cambiarPagina(seg: Segmento, pagina: number | string) {
    const p = typeof pagina === 'number' ? pagina : Number(pagina);
    if (!Number.isFinite(p)) return;
    this.mostrarPagina(seg, p);
    setTimeout(() => this.pageContent?.scrollToTop(400), 100);
  }

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
    const rango = 1;

    if (total <= 2) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const paginas: (number | string)[] = [];
    paginas.push(1);

    if (actual - rango > 2) paginas.push('...');
    for (let i = Math.max(2, actual - rango); i <= Math.min(total - 1, actual + rango); i++) {
      paginas.push(i);
    }
    if (actual + rango < total - 1) paginas.push('...');
    paginas.push(total);

    return paginas;
  }

  onCardClick(coche: any) {
    if (this.esMio(coche)) {
      this.modalCarId = coche?._id ?? coche?.id ?? null;
      this.modalOpen = !!this.modalCarId; // abre el modal propio
    } else {
      this.router.navigate(['/renta-ficha', coche._id ?? coche.id]);
    }
  }

  private esMio(c: any): boolean {
    const cid = String(c?._id ?? c?.id ?? '');
    if (cid && this.myCarIds.has(cid)) return true;

    const owner = c?.propietarioId || c?.propietario?._id || c?.ownerId || c?.userId || null;
    if (owner && this.currentUserId) {
      return String(owner) === String(this.currentUserId);
    }
    return false;
  }
  getEsMio(c: any): boolean {
    return this.esMio(c);
  }

  trackCar = (_: number, c: any) => c?._id ?? c?.id ?? `${c?.marca}-${c?.modelo}-${c?.anio}`;

  refrescar(ev: CustomEvent) {
    const done = () => (ev.target as HTMLIonRefresherElement).complete();
    if (this.vistaActiva === 'mios' && this.isLoggedIn) {
      this.cargarMios();
      setTimeout(done, 300);
    } else {
      this.cargarTodos();
      setTimeout(done, 300);
    }
  }

  // ===== handlers del modal propio =====
  goToFicha() {
    if (!this.modalCarId) return;
    this.pendingNav = ['/renta-ficha', this.modalCarId];
    this.modalOpen = false; // cerrar primero
  }

  goToDisponibilidad() {
    if (!this.modalCarId) return;
    this.pendingNav = ['/disponibilidad-car', this.modalCarId];
    this.modalOpen = false; // cerrar primero
  }

  closeModal() {
    this.modalOpen = false;
  }

  /** Se invoca desde el template con (didDismiss) cuando el modal YA se cerró */
  onModalDismiss() {
    const nav = this.pendingNav;
    this.pendingNav = null;
    this.modalCarId = null;
    if (nav) {
      this.router.navigate(nav);
    }
  }

  ionViewWillEnter() {
    this.refreshCurrentUserId();
    this.cargarTodos();          
    if (this.isLoggedIn) {
      this.cargarMios();         
    }
    this.paginaTodosActual = 1;
    this.paginaMiosActual = 1;
    this.aplicarFiltros();
  }

}
