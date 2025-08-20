import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationStart } from '@angular/router';
import { ToastController, PopoverController } from '@ionic/angular';
import { Subscription, filter } from 'rxjs';

import { LoteService } from '../../services/lote.service';
import { GeneralService } from '../../services/general.service';
import { ListComponent } from '../../components/filtos/list/list.component';
import { RegistroService } from '../../services/registro.service';

interface Direccion {
  ciudad: string;
  estado: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-lote',
  templateUrl: './lote.page.html',
  styleUrls: ['./lote.page.scss'],
  standalone: false
})
export class LotePage implements OnInit, OnDestroy {
  loteId!: string;
  lote: any | null = null;

  isOwner = false;
  private myLotIds: Set<string> = new Set();

  carrosDelLote: any[] = [];
  motosDelLote: any[] = [];

  autosStorage: any[] = [];   // combinado + normalizado
  autosFiltrados: any[] = [];
  autosPaginados: any[] = [];

  previewImagenPrincipal: string | null = null;
  direccionCompleta = 'Obteniendo ubicación...';
  public totalAutos = 0;

  filtros = [
    { label: 'Marca', tipo: 'marca' },
    { label: 'Precio', tipo: 'precio' },
    { label: 'Tipo', tipo: 'tipo' }, // auto | moto | nuevo | seminuevo | usado | suv | sedán ...
    { label: 'Año', tipo: 'anio' },
    // { label: 'Color',  tipo: 'color' },
  ];

  filtrosAplicados: any = {
    precio: null, // { rango: [min, max] }
    anio: null,   // { anio: 2022 }
    color: null,  // { label: 'Rojo' }
    marca: null,  // { label: 'Nissan' }
    tipo: null,   // { label: 'Auto'|'Moto'|'Seminuevo'|'SUV'... }
  };

  ordenActivo: string | null = null;

  paginaActual = 1;
  itemsPorPagina!: number;   // se toma de valorGlobal$
  totalPaginas = 1;
  paginas: number[] = [];

  private navSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private popoverCtrl: PopoverController,
    private loteService: LoteService,
    private generalService: GeneralService,
    private toastCtrl: ToastController,
    private registroService: RegistroService
  ) { }

  ngOnInit(): void {
    this.loteId = this.route.snapshot.paramMap.get('id')!;

    // itemsPorPagina desde global; default 12 si aún no llega
    this.generalService.valorGlobal$.subscribe((valor) => {
      this.itemsPorPagina = valor || 12;
      this.calcularPaginacion();
    });

    this.cargarLote();
    this.cargarCarros();
    this.cargarMotos();
    this.verificarPropiedadDelLote();

    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe(() => localStorage.removeItem('origenLote'));
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  // ===================== CARGAS =====================
  private cargarLote(): void {
    this.loteService.getLoteById(this.loteId).subscribe({
      next: (lote) => {
        this.lote = lote;
        this.previewImagenPrincipal = lote?.imagenPrincipal || null;

        if (!this.isOwner && this.myLotIds.size > 0) {
          const currentId = this.normId(this.loteId);
          this.isOwner = !!currentId && this.myLotIds.has(currentId);
        }

        if (Array.isArray(lote?.direccion) && lote.direccion.length) {
          const d = lote.direccion[0] as Direccion;
          this.generalService
            .obtenerDireccionDesdeCoordenadas(d.lat, d.lng)
            .then((dir) => (this.direccionCompleta = dir))
            .catch(() => (this.direccionCompleta = 'No se pudo obtener la dirección.'));
        }
      },
      error: async () => {
        await this.generalService.alert('Error', 'No se pudo cargar el lote', 'danger');
        this.router.navigateByUrl('/lotes');
      },
    });
  }

  private cargarCarros(): void {
    this.loteService.getcarro(this.loteId).subscribe({
      next: (res) => {
        this.carrosDelLote = Array.isArray(res) ? res : [];
        this.mergeVehicles();
      },
      error: async () => { /* silencioso */ },
    });
  }

  private cargarMotos(): void {
    this.loteService.getmoto(this.loteId).subscribe({
      next: (res) => {
        this.motosDelLote = Array.isArray(res) ? res : [];
        this.mergeVehicles();
      },
      error: async () => { /* silencioso */ },
    });
  }

  // ===================== NORMALIZACIÓN =====================
  // 1) Combina y deja autosFiltrados como fuente base SIEMPRE
  private mergeVehicles(): void {
    const normAutos = (this.carrosDelLote || []).map((a) => this.normalizeVehicle(a, 'auto'));
    const normMotos = (this.motosDelLote || []).map((m) => this.normalizeVehicle(m, 'moto'));

    this.autosStorage = [...normAutos, ...normMotos];
    this.autosFiltrados = [...this.autosStorage]; // ← base inicial SIEMPRE es autosFiltrados

    this.totalAutos = this.autosFiltrados.length;

    // Orden y paginación iniciales
    this.ordenarAutos(this.ordenActivo || 'anioDesc', true);
    this.calcularPaginacion();
  }

  private normalizeVehicle(v: any, tipoVehiculo: 'auto' | 'moto') {
    // precioDesde / precioHasta
    const preciosVersion = Array.isArray(v?.version)
      ? v.version.map((x: any) => Number(x?.Precio)).filter(Number.isFinite)
      : [];
    const precioDesde = preciosVersion.length
      ? Math.min(...preciosVersion)
      : (Number(v?.precioDesde) || Number(v?.precio) || 0);
    const precioHasta = preciosVersion.length
      ? Math.max(...preciosVersion)
      : (Number(v?.precioHasta) || Number(v?.precio) || precioDesde || 0);

    const anio = Number(v?.anio) || null;
    const marca = (Array.isArray(v?.marca) ? (v.marca[0] ?? '') : (v?.marca ?? '')).toString();

    const colorStr = Array.isArray(v?.color)
      ? (v.color[0] ?? '').toString()
      : (v?.color ?? '').toString();

    const id = (v?._id ?? v?.id ?? '').toString();

    // Tipo de venta (si existe)
    const tipoVenta = (v?.tipoVenta ?? '').toString().trim().toLowerCase(); // 'nuevo'|'seminuevo'|'usado'

    // Un "tipo" genérico por si usas SUV / Sedán / Pickup / etc. en distintos campos
    const tipoGenerico = this.firstNonEmptyLower([
      v?.tipo,
      v?.carroceria,
      v?.categoria,
      v?.segmento,
    ]);

    return {
      ...v, // mantener forma original para app-cartas
      _id: id,
      tipoVehiculo,          // 'auto' | 'moto'
      tipoVenta,             // 'nuevo' | 'seminuevo' | 'usado' (si aplica)
      tipoGenerico,          // 'suv' | 'sedán' | ...
      marca,
      colorStr,
      precioDesde,
      precioHasta,
      anio,
      imagenPrincipal: v?.imagenPrincipal || v?.imagenes?.[0] || null,
    };
  }

  private firstNonEmptyLower(vals: any[]): string {
    for (const val of vals) {
      const s = (val ?? '').toString().trim();
      if (s) return s.toLowerCase();
    }
    return '';
  }

  private canonTipoLabel(label: any): string {
    const raw = (label ?? '').toString().trim().toLowerCase();

    // sinónimos comunes
    const map: Record<string, string> = {
      'carro': 'auto',
      'coche': 'auto',
      'automóvil': 'auto',
      'automovil': 'auto',
      'motoneta': 'moto',
      'semineuvo': 'seminuevo', // typo frecuente
      'semi nuevo': 'seminuevo',
      'usada': 'usado',
      'nuevo(a)': 'nuevo',
      'suv': 'suv',
      'sedan': 'sedán',
    };

    return map[raw] ?? raw;
  }

  private matchesTipo(x: any, t: string): boolean {
    if (!t) return true;

    // Coincidir contra los 3 ejes
    const tv = (x.tipoVehiculo ?? '').toString().toLowerCase(); // auto | moto
    const venta = (x.tipoVenta ?? '').toString().toLowerCase(); // nuevo | seminuevo | usado
    const gen = (x.tipoGenerico ?? '').toString().toLowerCase(); // suv | sedán | pickup ...

    return tv === t || venta === t || gen === t;
  }

  // ===================== PROPIEDAD DEL LOTE =====================
  private verificarPropiedadDelLote(): void {
    this.registroService.allLotes('mios').subscribe({
      next: (res) => {
        const lista: any[] = Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.data)
            ? (res as any).data
            : Array.isArray((res as any)?.lotes)
              ? (res as any).lotes
              : [];

        this.myLotIds = new Set(
          lista.map((x: any) => this.normId(x?._id || x?.id)).filter(Boolean)
        );

        const currentId = this.normId(this.loteId);
        this.isOwner = !!currentId && this.myLotIds.has(currentId);
      },
      error: () => (this.isOwner = false),
    });
  }

  editarLote(): void {
    if (!this.lote) return;
    if (!this.isOwner) {
      this.toastCtrl.create({ message: 'No puedes editar este lote.', duration: 1500 }).then(t => t.present());
      return;
    }
    this.router.navigate(['/lote-edit', this.lote._id]);
  }

  async copiarTelefono(): Promise<void> {
    if (!this.lote?.telefonoContacto) return;
    try {
      await navigator.clipboard.writeText(this.lote.telefonoContacto);
      const t = await this.toastCtrl.create({ message: 'Teléfono copiado', duration: 1500 });
      t.present();
    } catch { }
  }

  volver(): void { this.router.navigate(['/lotes']); }

  // ===================== FILTROS / ORDEN / PAGINACIÓN =====================
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

    this.aplicarFiltros(true);
  }

  // 2) Aplicar filtros SIN fallback a autosStorage cuando no hay resultados
  aplicarFiltros(resetPagina = false) {
    // Siempre filtramos partiendo de autosStorage
    let arr = [...this.autosStorage];

    const { precio, anio, color, marca, tipo } = this.filtrosAplicados;

    if (precio?.rango?.length === 2) {
      const [min, max] = precio.rango;
      arr = arr.filter((x) => (x.precioDesde ?? 0) >= min && (x.precioDesde ?? 0) <= max);
    }

    if (anio?.anio) {
      arr = arr.filter((x) => Number(x.anio) === Number(anio.anio));
    }

    if (color?.label) {
      const c = color.label.toString().toLowerCase();
      arr = arr.filter((x) => (x.colorStr ?? '').toString().toLowerCase() === c);
    }

    if (marca?.label) {
      const m = marca.label.toString().toLowerCase();
      arr = arr.filter((x) => (x.marca ?? '').toString().toLowerCase() === m);
    }

    if (tipo?.label) {
      const t = this.canonTipoLabel(tipo.label); // auto | moto | nuevo | seminuevo | usado | suv | sedán...
      arr = arr.filter((x) => this.matchesTipo(x, t));
    }

    // Actualizamos SIEMPRE la fuente base visible
    this.autosFiltrados = arr;              // ← si no hay nada, queda []
    this.totalAutos = this.autosFiltrados.length;

    // Mantén el orden actual y recalcula paginación
    this.ordenarAutos(this.ordenActivo || 'anioDesc', true);

    if (resetPagina) this.paginaActual = 1;
    this.calcularPaginacion();
  }

  // 3) Ordenar SIEMPRE sobre autosFiltrados (nunca regresar a autosStorage)
  ordenarAutos(criterio: string, silencioso = false) {
    this.ordenActivo = criterio;

    const base = this.autosFiltrados; // ← siempre sobre el filtrado (aunque esté vacío)

    switch (criterio) {
      case 'precioAsc':
        base.sort((a, b) => (a.precioDesde ?? 0) - (b.precioDesde ?? 0));
        break;
      case 'precioDesc':
        base.sort((a, b) => (b.precioDesde ?? 0) - (a.precioDesde ?? 0));
        break;
      case 'anioDesc':
      default:
        base.sort((a, b) => (b.anio ?? 0) - (a.anio ?? 0));
        break;
    }

    // Re-slice de la página actual
    this.mostrarPagina(this.paginaActual);
  }

  // 4) Paginación SIEMPRE sobre autosFiltrados
  calcularPaginacion() {
    const porPagina = this.itemsPorPagina || 12;
    const total = this.autosFiltrados.length;

    this.totalPaginas = Math.max(1, Math.ceil(total / porPagina));
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);

    // Si estoy en una página fuera de rango (por ejemplo, pasé de resultados a 0)
    if (this.paginaActual > this.totalPaginas) this.paginaActual = this.totalPaginas;

    this.mostrarPagina(this.paginaActual);
  }

  mostrarPagina(pagina: number) {
    const porPagina = this.itemsPorPagina || 12;

    if (pagina < 1) pagina = 1;
    if (pagina > this.totalPaginas) pagina = this.totalPaginas;

    this.paginaActual = pagina;

    const inicio = (pagina - 1) * porPagina;
    const fin = inicio + porPagina;

    // Base SIEMPRE es autosFiltrados (puede estar vacío)
    this.autosPaginados = this.autosFiltrados.slice(inicio, fin);
  }

  setPagina(n: number) {
    this.mostrarPagina(n);
  }

  // —— NUEVO: helpers para paginación reducida ——
  esNumero(valor: any): valor is number {
    return typeof valor === 'number';
  }

  get paginasReducidas(): (number | string)[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;
    const rango = 1; // cuántos vecinos mostrar

    if (total <= 2) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pags: (number | string)[] = [];
    pags.push(1);

    if (actual - rango > 2) pags.push('...');
    for (let i = Math.max(2, actual - rango); i <= Math.min(total - 1, actual + rango); i++) {
      pags.push(i);
    }
    if (actual + rango < total - 1) pags.push('...');
    pags.push(total);

    return pags;
  }
  // ————————————————————————————————

  // 5) Al resetear, vuelve a mostrar TODO pero sin fallback raro
  resetearFiltros() {
    this.filtrosAplicados = {
      precio: null,
      anio: null,
      color: null,
      marca: null,
      tipo: null
    };

    // Mostrar todo (copia)
    this.autosFiltrados = [...this.autosStorage];
    this.totalAutos = this.autosFiltrados.length;

    this.ordenarAutos(this.ordenActivo || 'anioDesc', true);
    this.paginaActual = 1;
    this.calcularPaginacion();
  }

  // ===================== HELPERS =====================
  private normId(id: any): string {
    return String(id ?? '').trim().toLowerCase();
  }
}
