import { Component, OnInit, ViewChild, OnDestroy, ChangeDetectionStrategy } from "@angular/core";
import { IonContent, PopoverController } from "@ionic/angular";
import { Router, NavigationStart } from "@angular/router";
import { RentaService, ListarCochesResp, RentaFiltro } from "../../services/renta.service";
import { ListComponent } from "../../components/filtos/list/list.component";
import { filter, map, catchError, finalize, distinctUntilChanged, switchMap } from "rxjs/operators";
import { GeneralService } from "../../services/general.service";
import { ReservaService, RentalBooking, BookingStatus } from "../../services/reserva.service";
import { of, forkJoin, Subscription } from "rxjs";
import { ActivatedRoute } from "@angular/router";

type NumOrDots = number | string;
type Segmento = "todos" | "mios";

@Component({
  selector: "app-renta-coches",
  templateUrl: "./renta-coches.page.html",
  styleUrls: ["./renta-coches.page.scss"],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Default,
})
export class RentaCochesPage implements OnInit, OnDestroy {
  @ViewChild("pageContent", { static: false }) pageContent!: IonContent;

  get isLoggedIn(): boolean {
    return !!localStorage.getItem("token");
  }

  private myCarIds = new Set<string>();
  private currentUserId: string | null = null;
  private estadoQP: string | null = null;
  private estadoSub?: Subscription;
  private routerSub?: any;
  userRol: string | null = null;
  vistaActiva: Segmento = "todos";
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
  readonly itemsPorPagina = 8;
  ordenActual: "precioAsc" | "precioDesc" | "recientes" | "" = "";
  filtros = [
    { label: "$", tipo: "precio" },
    { label: "Marca", tipo: "marca" },
  ];

  filtrosAplicados: any = {
    precio: null,
    anio: null,
    marca: null,
    disponibilidad: null as null | { desde?: string; hasta?: string },
  };

  private lastPopover?: HTMLIonPopoverElement | null;
  modalOpen = false;
  modalCarId: string | null = null;
  private pendingNav: any[] | null = null;
  minFecha = this.toLocalISODate();
  rangoTexto = "";
  fechasSeleccionadas: string[] = [];
  highlightedRange: Array<{ date: string; textColor?: string; backgroundColor?: string }> = [];

  modalFechasOpen = false;
  tempFechasSeleccionadas: string[] = [];
  tempHighlightedRange: Array<{ date: string; textColor?: string; backgroundColor?: string }> = [];

  dispoLoading = false;
  private dispoReqId = 0;

  constructor(
    private rentaService: RentaService,
    private popoverCtrl: PopoverController,
    private generalService: GeneralService,
    private router: Router,
    private reservaService: ReservaService,
    private route: ActivatedRoute
  ) {
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => {
        this.modalOpen = false;
        this.modalCarId = null;
        this.pendingNav = null;
      });
  }

  ngOnInit() {
    console.log("[RentaCoches] rentaService.baseUrl =", this.rentaService.baseUrl);

    this.refreshCurrentUserId();
    this.route.queryParamMap
      .pipe(
        map((q) => (q.get("estado") || "").trim() || null),
        distinctUntilChanged()
      )
      .subscribe((estado) => {
        this.estadoQP = estado;
        this.cargarTodos();
      });

    // Solo cargar coches propios si no es cliente
    if (this.isLoggedIn && this.userRol !== "cliente") {
      this.cargarMios();
    }

    const d = this.filtrosAplicados?.disponibilidad;
    if (d?.desde && d?.hasta) {
      this.fechasSeleccionadas = [d.desde, d.hasta].sort();
      this.rebuildHighlightAndText();
    } else if (d?.desde) {
      this.fechasSeleccionadas = [d.desde];
      this.rebuildHighlightAndText();
    }
  }

  ngOnDestroy(): void {
    this.lastPopover?.dismiss().catch(() => { });
    this.lastPopover = null;
    this.routerSub?.unsubscribe?.();
    this.estadoSub?.unsubscribe();
  }

  private refreshCurrentUserId() {
    try {
      const raw = localStorage.getItem("user");
      const u = raw ? JSON.parse(raw) : null;
      this.currentUserId = u?._id || u?.id || u?.userId || null;
      this.userRol = u?.rol || u?.role || null;
    } catch {
      this.currentUserId = null;
      this.userRol = null;
    }
  }

  precioPorDia(c: any): number {
    const v = c?.precio?.porDia ?? c?.precioPorDia ?? c?.precio ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private cargarTodos(): void {
    this.loading = true;
    this.error = null;

    const filtro: RentaFiltro | undefined = this.estadoQP
      ? { estado: this.estadoQP.trim() }
      : undefined;

    this.rentaService
      .listarCoches(filtro)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: ListarCochesResp) => {
          const items = (Array.isArray(res?.rentals)
            ? res.rentals
            : Array.isArray(res?.autos)
              ? res.autos
              : Array.isArray(res?.data)
                ? res.data
                : Array.isArray(res as any)
                  ? (res as any)
                  : []) as any[];

          this.todosStorage = (items || []).filter(
            (x: any) => (x?.estadoRenta ?? "disponible") !== "inactivo"
          );
          this.totalTodos = this.todosStorage.length;
          this.aplicarFiltros();
          this.ordenarAutos("recientes");
        },
        error: (err) => {
          console.error("[RentaCoches] listarCoches error:", err);
          this.error = "Error al cargar coches";
          this.todosStorage = [];
          this.totalTodos = 0;
          this.aplicarFiltros();
        },
      });
  }

  private cargarMios() {
    this.refreshCurrentUserId();

    if (!this.isLoggedIn || this.userRol === "cliente") {
      this.miosStorage = [];
      this.totalMios = 0;
      this.myCarIds.clear();
      return;
    }

    this.rentaService.misCoches().subscribe({
      next: (res: any[]) => {
        const items = Array.isArray(res) ? res : [];
        this.miosStorage = items || [];
        this.totalMios = this.miosStorage.length;
        this.myCarIds = new Set(
          this.miosStorage.map((x) => String(x?._id ?? x?.id)).filter(Boolean)
        );
        this.aplicarFiltros();
      },
      error: (err) => {
        console.error("[RentaCoches] misCoches error:", err);
        this.miosStorage = [];
        this.totalMios = 0;
        this.myCarIds.clear();
      },
    });
  }

  onSegmentChange() {
    if (
      this.vistaActiva === "mios" &&
      this.isLoggedIn &&
      this.userRol !== "cliente" &&
      this.miosStorage.length === 0
    ) {
      this.cargarMios();
    }

    if (this.vistaActiva === "todos") this.paginaTodosActual = 1;
    else this.paginaMiosActual = 1;

    this.aplicarFiltros();
    setTimeout(() => this.pageContent?.scrollToTop(300), 50);
  }

  private createdTs(x: any) {
    const raw = x?.createdAt;
    const t = raw ? new Date(raw).getTime() : NaN;
    return Number.isFinite(t) ? t : 0;
  }

  ordenarAutos(criterio: "precioAsc" | "precioDesc" | "recientes" | "" | string) {
    const c = (criterio ?? "").toString() as
      | "precioAsc"
      | "precioDesc"
      | "recientes"
      | "";
    this.ordenActual = c;
    const base =
      this.vistaActiva === "todos"
        ? this.todosFiltrados.length
          ? [...this.todosFiltrados]
          : [...this.todosStorage]
        : this.miosFiltrados.length
          ? [...this.miosFiltrados]
          : [...this.miosStorage];

    if (c === "precioAsc") {
      base.sort((a, b) => this.precioPorDia(a) - this.precioPorDia(b));
    } else if (c === "precioDesc") {
      base.sort((a, b) => this.precioPorDia(b) - this.precioPorDia(a));
    } else if (c === "recientes") {
      base.sort((a, b) => this.createdTs(b) - this.createdTs(a));
    }

    if (this.vistaActiva === "todos") {
      this.todosFiltrados = base;
      this.calcularPaginacion("todos");
    } else {
      this.miosFiltrados = base;
      this.calcularPaginacion("mios");
    }

    setTimeout(() => this.pageContent?.scrollToTop(300), 50);
  }

  async mostrarOpciones(ev: Event, tipo: string) {
    await this.lastPopover?.dismiss().catch(() => { });
    this.lastPopover = await this.popoverCtrl.create({
      component: ListComponent,
      event: ev,
      translucent: true,
      componentProps: { tipo, extra: "renta" },
    });

    await this.lastPopover.present();
    const { data, role } = await this.lastPopover.onDidDismiss();
    this.lastPopover = null;

    if (role === "cancel" || role === "backdrop") return;

    this.filtrosAplicados[tipo] = data === null ? null : data;
    this.aplicarFiltros();
  }

  resetearFiltros() {
    this.filtrosAplicados = {
      precio: null,
      anio: null,
      marca: null,
      disponibilidad: null,
    };
    this.fechasSeleccionadas = [];
    this.highlightedRange = [];
    this.rangoTexto = "";
    this.aplicarFiltros();
  }

  private normStr(v: any): string {
    return (v ?? "").toString().toLowerCase().trim();
  }

  aplicarFiltros() {
    const base =
      this.vistaActiva === "todos" ? this.todosStorage : this.miosStorage;
    let lista = [...base];
    const { precio, anio, marca, disponibilidad } = this.filtrosAplicados;

    if (precio?.rango?.length === 2) {
      const [min, max] = precio.rango.map((n: any) => Number(n));
      lista = lista.filter(
        (c) => this.precioPorDia(c) >= min && this.precioPorDia(c) <= max
      );
    }

    if (anio) {
      lista = lista.filter((c) => Number(c?.anio) === Number(anio));
    }

    if (marca) {
      const mf = this.normStr(marca?.label ?? marca?.value ?? marca);
      if (mf && mf !== "todos" && mf !== "todas") {
        lista = lista.filter((c) => this.normStr(c?.marca) === mf);
      }
    }

    const d = disponibilidad;
    if (d?.desde || d?.hasta) {
      const desde = d.desde || d.hasta;
      const hasta = d.hasta || d.desde;
      if (desde) {
        const reqId = ++this.dispoReqId;
        this.dispoLoading = true;
        this.fetchUnavailableCarIdsForRange(desde, hasta, lista).subscribe({
          next: (noDispSet: Set<string>) => {
            if (reqId !== this.dispoReqId) return;
            const filtrada = lista.filter((c) => {
              const id = String(c?._id ?? c?.id ?? "");
              return id && !noDispSet.has(id);
            });
            if (this.vistaActiva === "todos") {
              this.todosFiltrados = filtrada;
              this.totalTodos = this.todosFiltrados.length;
              this.paginaTodosActual = 1;
              this.calcularPaginacion("todos");
            } else {
              this.miosFiltrados = filtrada;
              this.totalMios = this.miosFiltrados.length;
              this.paginaMiosActual = 1;
              this.calcularPaginacion("mios");
            }
            this.dispoLoading = false;
          },
          error: () => {
            this.dispoLoading = false;
          },
        });
        return;
      }
    }

    if (this.vistaActiva === "todos") {
      this.todosFiltrados = lista;
      this.totalTodos = this.todosFiltrados.length;
      this.paginaTodosActual = 1;
      this.calcularPaginacion("todos");
    } else {
      this.miosFiltrados = lista;
      this.totalMios = this.miosFiltrados.length;
      this.paginaMiosActual = 1;
      this.calcularPaginacion("mios");
    }
  }

  private fetchUnavailableCarIdsForRange(desde: string, hasta?: string, listaBase: any[] = []) {
    const from = this.dayStart(desde);
    const to = this.dayEnd(hasta || desde);
    const baseFiltro = {
      desde: from.toISOString(),
      hasta: to.toISOString(),
      page: 1,
      limit: 5000,
      sort: "fechaInicio:asc",
    };
    const statuses: BookingStatus[] = ["pendiente", "aceptada", "en_curso"];
    const calls = statuses.map((st) =>
      this.reservaService.listarBookings({ ...baseFiltro, estatus: st }).pipe(
        map((resp) => resp?.bookings || []),
        catchError(() => of<RentalBooking[]>([]))
      )
    );
    const ymdRange = this.buildYmdList(from, to);
    const exceptionsByListLocalIds = new Set<string>();
    for (const c of listaBase) {
      const id = String(c?._id ?? c?.id ?? "");
      if (!id) continue;
      const ex = Array.isArray(c?.excepcionesNoDisponibles) ? c.excepcionesNoDisponibles : [];
      if (ex.length && this.excepcionesIntersectan(ex, from, to)) {
        exceptionsByListLocalIds.add(id);
      }
    }
    const idsSinExEnLista = listaBase
      .map((c) => String(c?._id ?? c?.id ?? ""))
      .filter((id) => id && !exceptionsByListLocalIds.has(id));
    const exceptionCalls$ = idsSinExEnLista.length
      ? forkJoin(
        idsSinExEnLista.map((id) =>
          this.rentaService
            .diasNoDisponibles(id)
            .pipe(map((dias: string[]) => (dias.some((d) => ymdRange.has(d)) ? id : null)), catchError(() => of<string | null>(null)))
        )
      ).pipe(map((res) => new Set(res.filter(Boolean) as string[])))
      : of(new Set<string>());
    return forkJoin(calls).pipe(
      switchMap((grupos: RentalBooking[][]) => {
        const all: RentalBooking[] = ([] as RentalBooking[]).concat(...grupos);
        const noDisp = new Set<string>();
        for (const b of all) {
          const carId = this.getCarIdFromBooking(b);
          if (!carId) continue;
          const bi = this.dayStart(b.fechaInicio);
          const bf = this.dayEnd(b.fechaFin);
          if (this.overlap(from, to, bi, bf)) noDisp.add(carId);
        }
        for (const x of exceptionsByListLocalIds) noDisp.add(x);
        return exceptionCalls$.pipe(
          map((extra: Set<string>) => {
            for (const x of extra) noDisp.add(x);
            return noDisp;
          })
        );
      })
    );
  }

  private buildYmdList(from: Date, to: Date): Set<string> {
    const s = new Set<string>();
    const cur = new Date(from);
    while (cur.getTime() <= to.getTime()) {
      s.add(this.toISOyyyyMMdd(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return s;
  }

  private excepcionesIntersectan(ex: Array<{ inicio: any; fin: any }>, from: Date, to: Date): boolean {
    for (const e of ex) {
      if (!e?.inicio || !e?.fin) continue;
      const bi = this.dayStart(e.inicio);
      const bf = this.dayEnd(e.fin);
      if (this.overlap(from, to, bi, bf)) return true;
    }
    return false;
  }

  private getCarIdFromBooking(b: RentalBooking): string {
    const rc: any = (b as any)?.rentalCar;
    return String(rc?._id ?? rc?.id ?? rc ?? "").trim();
  }

  private overlap(a1: Date, a2: Date, b1: Date, b2: Date) {
    return a1 <= b2 && b1 <= a2;
  }

  private dayStart(d: string | Date): Date {
    const dd = typeof d === "string" ? this.asLocalDateOnly(d) : new Date(d);
    dd.setHours(0, 0, 0, 0);
    return dd;
  }

  private dayEnd(d: string | Date): Date {
    const dd = typeof d === "string" ? this.asLocalDateOnly(d) : new Date(d);
    dd.setHours(23, 59, 59, 999);
    return dd;
  }

  private isCarAvailableLocal(coche: any, from: Date, to: Date): boolean {
    const parse = (x: any) => {
      const ini = x?.inicio ?? x?.ini ?? x?.from ?? x?.startDate ?? x?.start ?? x?.desde ?? x?.fechaInicio;
      const fin = x?.fin ?? x?.hasta ?? x?.to ?? x?.endDate ?? x?.end ?? x?.fechaFin;
      if (!ini || !fin) return null;
      const di = this.dayStart(ini), df = this.dayEnd(fin);
      return { ini: di, fin: df };
    };
    const sets: any[] = [
      ...(Array.isArray(coche?.reservas) ? coche.reservas.filter((r: any) => r?.estatus !== "cancelada") : []),
      ...(Array.isArray(coche?.bloqueos) ? coche.bloqueos : []),
      ...(Array.isArray(coche?.noDisponibilidad) ? coche.noDisponibilidad : []),
      ...(Array.isArray(coche?.excepciones) ? coche.excepciones : []),
      ...(Array.isArray(coche?.excepcionesNoDisponibles) ? coche.excepcionesNoDisponibles : []),
    ];
    for (const s of sets) {
      const r = parse(s);
      if (!r) continue;
      if (this.overlap(from, to, r.ini, r.fin)) return false;
    }
    return true;
  }

  calcularPaginacion(seg: Segmento) {
    const base = seg === "todos" ? this.todosFiltrados : this.miosFiltrados;
    const totalPag = Math.max(1, Math.ceil(base.length / this.itemsPorPagina));
    if (seg === "todos") {
      this.totalPaginasTodos = totalPag;
      this.mostrarPagina("todos", this.paginaTodosActual);
    } else {
      this.totalPaginasMios = totalPag;
      this.mostrarPagina("mios", this.paginaMiosActual);
    }
  }

  mostrarPagina(seg: Segmento, pagina: number) {
    const base = seg === "todos" ? this.todosFiltrados : this.miosFiltrados;
    const totalPag = seg === "todos" ? this.totalPaginasTodos : this.totalPaginasMios;
    const pagSan = Math.min(Math.max(1, pagina), totalPag);
    const inicio = (pagSan - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    const slice = base.slice(inicio, fin);
    if (seg === "todos") {
      this.paginaTodosActual = pagSan;
      this.todosPaginados = slice;
    } else {
      this.paginaMiosActual = pagSan;
      this.miosPaginados = slice;
    }
  }

  cambiarPagina(seg: Segmento, pagina: number | string) {
    const p = typeof pagina === "number" ? pagina : Number(pagina);
    if (!Number.isFinite(p)) return;
    this.mostrarPagina(seg, p);
    setTimeout(() => this.pageContent?.scrollToTop(400), 100);
  }

  onCardClick(coche: any) {
    if (this.userRol === "cliente") {
      this.router.navigate(["/renta-ficha", coche._id ?? coche.id]);
      return;
    }
    if (this.esMio(coche)) {
      this.modalCarId = coche?._id ?? coche?.id ?? null;
      this.modalOpen = !!this.modalCarId;
    } else {
      this.router.navigate(["/renta-ficha", coche._id ?? coche.id]);
    }
  }

  private esMio(c: any): boolean {
    const cid = String(c?._id ?? c?.id ?? "");
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
    if (this.vistaActiva === "mios" && this.isLoggedIn && this.userRol !== "cliente") {
      this.cargarMios();
      setTimeout(done, 300);
    } else {
      this.cargarTodos();
      setTimeout(done, 300);
    }
  }

  goToFicha() {
    if (!this.modalCarId) return;
    this.pendingNav = ["/renta-ficha", this.modalCarId];
    this.modalOpen = false;
  }

  goToDisponibilidad() {
    if (!this.modalCarId) return;
    this.pendingNav = ["/disponibilidad-car", this.modalCarId];
    this.modalOpen = false;
  }

  closeModal() {
    this.modalOpen = false;
  }

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

    if (!this.estadoQP) {
      this.cargarTodos();
    }

    if (this.isLoggedIn && this.userRol !== "cliente") {
      this.cargarMios();
    } else {
      this.miosStorage = [];
      this.totalMios = 0;
    }

    this.paginaTodosActual = 1;
    this.paginaMiosActual = 1;
    this.aplicarFiltros();
  }

  openModalFechas() {
    this.tempFechasSeleccionadas = [...this.fechasSeleccionadas];
    this.tempBuildHighlightedRange();
    this.modalFechasOpen = true;
  }

  closeModalFechas() {
    this.modalFechasOpen = false;
  }

  aplicarRango() {
    this.fechasSeleccionadas = [...this.tempFechasSeleccionadas];
    if (!this.fechasSeleccionadas.length) {
      this.highlightedRange = [];
      this.rangoTexto = "";
      this.filtrosAplicados.disponibilidad = null;
      this.aplicarFiltros();
      this.closeModalFechas();
      return;
    }
    const orden = [...this.fechasSeleccionadas].sort();
    const desde = orden[0];
    const hasta = orden[1] || orden[0];
    this.rebuildHighlightAndText();
    this.filtrosAplicados.disponibilidad = { desde, hasta };
    this.aplicarFiltros();
    this.closeModalFechas();
  }

  limpiarFechas() {
    this.fechasSeleccionadas = [];
    this.highlightedRange = [];
    this.rangoTexto = "";
    this.filtrosAplicados.disponibilidad = null;
    this.aplicarFiltros();
  }

  limpiarTemp() {
    this.tempFechasSeleccionadas = [];
    this.tempHighlightedRange = [];
  }

  onTempRangoChange() {
    if (this.tempFechasSeleccionadas.length > 2) {
      this.tempFechasSeleccionadas = this.tempFechasSeleccionadas.slice(-2);
    }
    this.tempBuildHighlightedRange();
  }

  private toLocalISODate(d = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  private asLocalDateOnly(isoLike: string): Date {
    const s = (isoLike || "").slice(0, 10);
    const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
    return new Date(y, m - 1, d);
  }

  private toISOyyyyMMdd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  private buildHighlightedRangeCore(list: string[]) {
    const out: Array<{ date: string; textColor?: string; backgroundColor?: string }> = [];
    if (!list?.length) return out;
    const fechas = [...list].sort();
    let inicio = this.asLocalDateOnly(fechas[0]);
    let fin = this.asLocalDateOnly(fechas[fechas.length - 1]);
    if (fin < inicio) [inicio, fin] = [fin, inicio];
    const danger = this.getCssVar("--ion-color-danger", "#e50914");
    const bgMiddle = this.toRgba(danger, 0.28);
    const bgEdge = this.toRgba(danger, 0.85);
    const fg = "#ffffff";
    const cursor = new Date(inicio);
    let i = 0;
    const totalDias = Math.floor((fin.getTime() - inicio.getTime()) / 86400000) + 1;
    while (cursor <= fin) {
      const isEdge = i === 0 || i === totalDias - 1;
      out.push({
        date: this.toISOyyyyMMdd(cursor),
        backgroundColor: isEdge ? bgEdge : bgMiddle,
        textColor: fg,
      });
      cursor.setDate(cursor.getDate() + 1);
      i++;
    }
    return out;
  }

  private tempBuildHighlightedRange() {
    this.tempHighlightedRange = this.buildHighlightedRangeCore(this.tempFechasSeleccionadas);
  }

  private rebuildHighlightAndText() {
    this.highlightedRange = this.buildHighlightedRangeCore(this.fechasSeleccionadas);
    if (!this.fechasSeleccionadas.length) {
      this.rangoTexto = "";
      return;
    }
    const orden = [...this.fechasSeleccionadas].sort();
    const d1 = this.formatDMY(orden[0]);
    const d2 = this.formatDMY(orden[1] || orden[0]);
    this.rangoTexto = d1 === d2 ? d1 : `${d1} – ${d2}`;
  }

  private formatDMY(isoLike: string): string {
    const d = this.asLocalDateOnly(isoLike);
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  }

  private getCssVar(name: string, fallback = "#e50914") {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  private toRgba(hexOrRgb: string, alpha = 1) {
    if (hexOrRgb.startsWith("rgb")) {
      return hexOrRgb.replace(")", `, ${alpha})`).replace("rgb(", "rgba(");
    }
    const hex = hexOrRgb.replace("#", "");
    const h = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex.padEnd(6, "0");
    const r = parseInt(h.slice(0, 2), 16),
      g = parseInt(h.slice(2, 4), 16),
      b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  get paginasReducidasTodos(): NumOrDots[] {
    return this.buildPaginasReducidas(this.paginaTodosActual, this.totalPaginasTodos);
  }

  get paginasReducidasMios(): NumOrDots[] {
    return this.buildPaginasReducidas(this.paginaMiosActual, this.totalPaginasMios);
  }

  esNumero(v: NumOrDots): v is number {
    return typeof v === "number";
  }

  private buildPaginasReducidas(actual: number, total: number): NumOrDots[] {
    const rango = 1;
    if (total <= 2) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const paginas: (number | string)[] = [];
    paginas.push(1);

    if (actual - rango > 2) paginas.push("...");
    for (let i = Math.max(2, actual - rango); i <= Math.min(total - 1, actual + rango); i++) {
      paginas.push(i);
    }
    if (actual + rango < total - 1) paginas.push("...");
    paginas.push(total);
    return paginas;
  }

}
