import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RentaService } from '../../services/renta.service';
import { GeneralService } from '../../services/general.service';
import { take } from 'rxjs/operators';
import { FooterComponent } from '../../components/footer/footer.component';

interface Ventana { inicio: string; fin: string; nota?: string; }
interface Excepcion { inicio: string; fin: string; motivo?: string; }
interface Ubicacion { ciudad: string; estado: string; }
type EstadoRenta = 'disponible' | 'rentado' | 'inactivo' | 'mantenimiento';

interface Rental {
  _id: string;
  marca: string;
  modelo: string;
  anio?: number;
  imagenPrincipal?: string;
  imagenes?: string[];
  precio?: number;
  deposito?: number | null;
  minDias?: number | null;
  ratingPromedio?: number;
  totalRentas?: number;
  estadoRenta?: EstadoRenta;
  transmision?: string;
  combustible?: string;
  pasajeros?: number;
  kilometrajeActual?: number;
  ubicacion?: Ubicacion;
  gps?: boolean;
  inmovilizador?: boolean;
  ventanasDisponibles?: Ventana[];
  excepcionesNoDisponibles?: Excepcion[];
  entrega?: any;
  requisitosConductor?: {
    edadMinima: number;
    antiguedadLicenciaMeses: number;
    permiteConductorAdicional: boolean;
    costoConductorAdicional?: number;
  };
  polizaPlataforma?: {
    aseguradora: string;
    cobertura: string;
    vigenciaDesde: string;
    vigenciaHasta: string;
    urlPoliza?: string;
  };

  politicaCombustible?: string;
  politicaLimpieza?: string;
  propietarioId?: string;
  duenoId?: string;
  ownerId?: string;
  usuarioId?: string;
  usuario?: { id?: string; _id?: string };
}

@Component({
  selector: 'app-renta-ficha',
  templateUrl: './renta-ficha.page.html',
  styleUrls: ['./renta-ficha.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class RentaFichaPage implements OnInit {
  private readonly LOGIN_ROUTE = '/login';

  loading = true;
  rental: Rental | null = null;
  isLoggedIn = false;
  highlightedRange: Array<{ date: string; textColor?: string; backgroundColor?: string }> = [];
  galeria: string[] = [];
  imagenSeleccionada: string | null = null;

  esDueno = false;

  get tieneVarias(): boolean { return (this.galeria?.length || 0) > 1; }

  get ratingEntero(): number {
    const r = Number(this.rental?.ratingPromedio ?? 0);
    return Math.max(0, Math.min(5, Math.round(r)));
  }

  minFecha = this.toLocalISODate();
  fechasSeleccionadas: string[] = [];

  get fechaInicio(): string | null {
    if (!this.fechasSeleccionadas?.length) return null;
    return [...this.fechasSeleccionadas].sort()[0] || null;
  }

  get fechaFin(): string | null {
    if (!this.fechasSeleccionadas?.length) return null;
    return [...this.fechasSeleccionadas].sort().slice(-1)[0] || null;
  }

  resumen: {
    valido: boolean;
    dias: number;
    diasSueltos: number;
    subtotalDia: number;
    total: number;
  } | null = null;

  @ViewChild(FooterComponent) footer!: FooterComponent;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rentaService: RentaService,
    private general: GeneralService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.general.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
      this.cdr.markForCheck();
    });

    const id = this.route.snapshot.paramMap.get('id')!;
    this.cargar(id);
  }

  private obtenerIdActual(): string | null {
    const g: any = this.general as any;
    try {
      return (
        g.currentUserId ||
        g.userId ||
        g.usuario?.id ||
        g.usuario?._id ||
        (typeof g.getUserId === 'function' ? g.getUserId() : null) ||
        null
      );
    } catch { return null; }
  }

  private extraerOwnerId(r: any): string | null {
    const cand = [
      r?.propietarioId, r?.duenoId, r?.ownerId, r?.usuarioId, r?.userId,
      r?.usuario?.id, r?.usuario?._id, r?.owner?.id, r?.owner?._id,
      r?.propietario?.id, r?.propietario?._id, r?.creadoPor?.id, r?.creadoPor?._id,
    ].filter(Boolean);
    return cand.length ? String(cand[0]) : null;
  }

  public soyPropietarioDeAuto(r: any = this.rental): boolean {
    if (!r) return false;
    const actual = this.obtenerIdActual();
    const owner = this.extraerOwnerId(r);
    return !!actual && !!owner && String(actual).trim() === String(owner).trim();
  }

  private toLocalISODate(d = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private asLocalDateOnly(isoLike: string): Date {
    const s = (isoLike || '').slice(0, 10);
    const [y, m, d] = s.split('-').map(n => parseInt(n, 10));
    return new Date(y, (m - 1), d);
  }

  private startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private diffDaysInclusive(inicio: Date, fin: Date): number {
    const ms = this.startOfDay(fin).getTime() - this.startOfDay(inicio).getTime();
    const excl = Math.ceil(ms / 86400000);
    return Math.max(1, excl + 1);
  }

  private toISOyyyyMMdd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private buildGaleria(res: Rental): string[] {
    const principal = res?.imagenPrincipal ? [res.imagenPrincipal] : [];
    const extras = Array.isArray(res?.imagenes) ? res.imagenes : [];
    const limpio = [...principal, ...extras].filter((u: any) => !!u && typeof u === 'string');
    return Array.from(new Set(limpio));
  }

  cargar(id: string) {
    this.loading = true;
    this.cdr.markForCheck();

    this.rentaService.cochePorId(id).pipe(take(1)).subscribe({
      next: (res: any) => {
        const cast: Rental = { ...res };
        this.rental = cast;
        this.galeria = this.buildGaleria(cast);
        this.imagenSeleccionada = this.galeria[0] || null;
        this.rentaService.misCoches().pipe(take(1)).subscribe({
          next: (mis) => {
            const idActual = this.obtenerIdActual();
            const esPorListado = Array.isArray(mis) && mis.some(a => String(a?._id || a?.id) === String(cast._id));
            const esPorOwnerEnFicha = this.soyPropietarioDeAuto(cast);
            this.esDueno = esPorListado || esPorOwnerEnFicha;
            console.log('[Ficha] idUsuario=', idActual, 'idAuto=', cast._id, 'esPorListado=', esPorListado, 'esPorOwner=', esPorOwnerEnFicha, 'esDueno=', this.esDueno);
            this.loading = false;
            if (this.fechasSeleccionadas.length >= 1) this.calcularTotal();
            this.buildHighlightedRange();
            this.cdr.markForCheck();
          },
          error: () => {
            this.esDueno = this.soyPropietarioDeAuto(cast);
            this.loading = false;
            if (this.fechasSeleccionadas.length >= 1) this.calcularTotal();
            this.buildHighlightedRange();
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.cdr.markForCheck();
        const msg = err?.error?.message || 'No se pudo cargar el vehículo';
        this.general.alert('Error', msg, 'danger');
        this.router.navigate(['/renta-coches']);
      }
    });
  }

  volver() {
    try { if (window.history.length > 2) return history.back(); } catch { }
    this.router.navigate(['/renta-coches']);
  }
  cerrar() { this.volver(); }

  cambiarImagen(dir: 'siguiente' | 'anterior') {
    const imgs = this.galeria;
    if (!imgs.length) return;
    const actual = this.imagenSeleccionada ?? imgs[0];
    const idx = Math.max(0, imgs.indexOf(actual));
    if (dir === 'siguiente' && idx < imgs.length - 1) this.imagenSeleccionada = imgs[idx + 1];
    if (dir === 'anterior' && idx > 0) this.imagenSeleccionada = imgs[idx - 1];
    this.cdr.markForCheck();
  }

  onImgError(ev: Event, url?: string) {
    (ev.target as HTMLImageElement).src = '/assets/placeholder-car.webp';
    if (url) {
      const i = this.galeria.indexOf(url);
      if (i >= 0) this.galeria.splice(i, 1);
      if (this.imagenSeleccionada === url) {
        this.imagenSeleccionada = this.galeria[0] || null;
      }
    }
    this.cdr.markForCheck();
  }

  trackByUrl(_i: number, url: string) { return url; }

  onRangoChange() {
    if (this.fechasSeleccionadas.length > 2) {
      this.fechasSeleccionadas = this.fechasSeleccionadas.slice(-2);
    }
    if (this.fechasSeleccionadas.length >= 1) {
      this.calcularTotal();
    } else {
      this.resumen = null;
    }
    this.buildHighlightedRange();
    this.cdr.markForCheck();
  }

  private buildHighlightedRange(): void {
    this.highlightedRange = [];
    if (!this.fechasSeleccionadas?.length) return;

    const fechas = [...this.fechasSeleccionadas].sort();
    let inicio = this.asLocalDateOnly(fechas[0]);
    let fin = this.asLocalDateOnly(fechas[fechas.length - 1]);
    if (fin < inicio) [inicio, fin] = [fin, inicio];

    const bg = 'var(--ion-color-danger)';
    const fg = '#ffffff';

    const cursor = new Date(inicio);
    while (cursor <= fin) {
      this.highlightedRange.push({
        date: this.toISOyyyyMMdd(cursor),
        backgroundColor: bg,
        textColor: fg,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  esFechaHabil = (_isoDateString: string) => true;

  private calcularTotal() {
    this.resumen = null;
    const r = this.rental;
    if (!r) { this.cdr.markForCheck(); return; }

    let inicioISO = this.fechaInicio;
    let finISO = this.fechaFin || this.fechaInicio;
    if (!inicioISO || !finISO) { this.cdr.markForCheck(); return; }

    let inicio = this.asLocalDateOnly(inicioISO);
    let fin = this.asLocalDateOnly(finISO);
    if (fin < inicio) [inicio, fin] = [fin, inicio];

    let dias = this.fechasSeleccionadas.length === 1 ? 1 : this.diffDaysInclusive(inicio, fin);

    const porDia = Number(r.precio || 0);
    const total = porDia * dias;

    this.resumen = {
      valido: dias > 0 && porDia > 0,
      dias,
      diasSueltos: dias,
      subtotalDia: porDia * dias,
      total,
    };

    this.cdr.markForCheck();
  }

  contactarWhatsApp(): void {
    if (!this.rental) return;

    const numero = "524427706776";
    const urlActual = window.location.href;

    const mensaje = `Hola, estoy interesado en rentar: \n\n🚗 *${this.rental.marca} ${this.rental.modelo}*. \n\n🔗 ${urlActual}`;
    const texto = encodeURIComponent(mensaje);

    window.open(`https://api.whatsapp.com/send?phone=${numero}&text=${texto}`, "_blank");
  }

  compartir() {
    const url = location.href;
    if (navigator.share) {
      navigator.share({
        title: `${this.rental?.marca} ${this.rental?.modelo}${this.rental?.anio ? ' ' + this.rental?.anio : ''} en renta`,
        text: 'Checa este vehículo en renta',
        url
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(url);
      this.general.toast('Enlace copiado', 'success');
    }
  }

  reservar() {
    if (!this.rental?._id) return;

    if (!this.isLoggedIn) {
      this.general.alert(
        'Inicia sesión',
        'Debes iniciar sesión para continuar con la reserva.',
        'info'
      );
      this.router.navigate(['/inicio']);
      return;
    }

    if (this.esDueno || this.soyPropietarioDeAuto(this.rental)) {
      this.general.toast('No puedes reservar tu propio vehículo.', 'warning');
      return;
    }

    const inicio = this.fechaInicio || null;
    const fin = this.fechaFin || this.fechaInicio || null;

    if (inicio && fin) {
      const dias = this.fechasSeleccionadas.length === 1
        ? 1
        : this.diffDaysInclusive(
          this.asLocalDateOnly(inicio),
          this.asLocalDateOnly(fin)
        );

      const min = Number(this.rental?.minDias ?? 0);
      if (min > 0 && dias < min) {
        this.general.toast(`La renta mínima es de ${min} día(s).`, 'warning');
        return;
      }

      this.router.navigate(
        ['/reservas', this.rental._id],
        { queryParams: { inicio, fin } }
      );
      return;
    }

    this.router.navigate(['/reservas', this.rental._id]);
  }

  abrirAviso() {
    if (this.footer?.mostrarAviso) {
      this.footer.mostrarAviso();
    } else {
      this.general.alert('Aviso de Privacidad', 'Contenido…', 'info');
    }
  }

  abrirTerminos() {
    const anyFooter = this.footer as any;
    if (anyFooter?.mostrarTerminos) {
      anyFooter.mostrarTerminos();
    } else {
      this.general.alert('Términos y condiciones', 'Contenido…', 'info');
    }
  }
}
