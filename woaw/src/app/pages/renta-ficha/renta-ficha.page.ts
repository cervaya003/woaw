import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RentaService } from '../../services/renta.service';
import { GeneralService } from '../../services/general.service';
import { take } from 'rxjs/operators';
import { FooterComponent } from '../../components/footer/footer.component'; // 👈 ajusta la ruta si es distinta

/* ===== Tipos (alineados al servicio nuevo) ===== */
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

  precio?: number;       // por día
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
}

@Component({
  selector: 'app-renta-ficha',
  templateUrl: './renta-ficha.page.html',
  styleUrls: ['./renta-ficha.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class RentaFichaPage implements OnInit {
  loading = true;
  rental: Rental | null = null;
  isLoggedIn = false;

  /** Fechas resaltadas para pintar TODO el rango en el ion-datetime */
  highlightedRange: Array<{ date: string; textColor?: string; backgroundColor?: string }> = [];

  // Galería
  galeria: string[] = [];
  imagenSeleccionada: string | null = null;
  get tieneVarias(): boolean { return (this.galeria?.length || 0) > 1; }

  get ratingEntero(): number {
    const r = Number(this.rental?.ratingPromedio ?? 0);
    return Math.max(0, Math.min(5, Math.round(r)));
  }

  // ===== Selección de fechas =====
  minFecha = this.toLocalISODate(); // yyyy-mm-dd
  fechasSeleccionadas: string[] = []; // 'YYYY-MM-DD' o ISO de ion-datetime

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

  // 👇 referencia al footer para abrir sus modales
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


  /* ================== Utilidades de fecha (sin TZ) ================== */
  private toLocalISODate(d = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Toma 'YYYY-MM-DD' o ISO y devuelve Date local yyyy-mm-dd (ignora zona). */
  private asLocalDateOnly(isoLike: string): Date {
    // usa sólo los 10 primeros caracteres si viene con 'T...' o 'Z'
    const s = (isoLike || '').slice(0, 10);
    const [y, m, d] = s.split('-').map(n => parseInt(n, 10));
    return new Date(y, (m - 1), d);
  }

  private startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** Diferencia INCLUSIVA en días (inicio y fin cuentan) */
  private diffDaysInclusive(inicio: Date, fin: Date): number {
    const ms = this.startOfDay(fin).getTime() - this.startOfDay(inicio).getTime();
    const excl = Math.ceil(ms / 86400000); // excluyente
    return Math.max(1, excl + 1);          // inclusivo
  }

  /** yyyy-mm-dd desde Date */
  private toISOyyyyMMdd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /* ================== Galería ================== */
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
        this.loading = false;

        if (this.fechasSeleccionadas.length >= 1) this.calcularTotal();
        this.buildHighlightedRange();

        this.cdr.markForCheck();
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

  // Navegación
  volver() {
    try { if (window.history.length > 2) return history.back(); } catch { }
    this.router.navigate(['/renta-coches']);
  }
  cerrar() { this.volver(); }

  // Galería
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

  /* ================== Fechas / Disponibilidad ================== */
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

  /** Construye highlightedRange con todas las fechas del rango (inclusivo) */
  private buildHighlightedRange(): void {
    this.highlightedRange = [];
    if (!this.fechasSeleccionadas?.length) return;

    const fechas = [...this.fechasSeleccionadas].sort();
    let inicio = this.asLocalDateOnly(fechas[0]);
    let fin = this.asLocalDateOnly(fechas[fechas.length - 1]);
    if (fin < inicio) [inicio, fin] = [fin, inicio];

    const bg = '#4463efff';
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

  // (Si decides usar disponibilidad real, mantenlo; para estilizado no es necesario)
  esFechaHabil = (_isoDateString: string) => true;

  /* ================== Cálculo de total ================== */
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

    // **INCLUSIVO**
    let dias = this.fechasSeleccionadas.length === 1 ? 1 : this.diffDaysInclusive(inicio, fin);

    const porDia = Number(r.precio || 0);
    const total = porDia * dias; // coherente con inclusivo

    this.resumen = {
      valido: dias > 0 && porDia > 0,
      dias,
      diasSueltos: dias,
      subtotalDia: porDia * dias,
      total,
    };

    this.cdr.markForCheck();
  }

  // CTAs
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

    const inicio = this.fechaInicio || null;
    const fin = this.fechaFin || this.fechaInicio || null;

    // Si el usuario seleccionó fechas, validamos y mandamos los params
    if (inicio && fin) {
      // Calcula días (inclusivo si ya tienes diffDaysInclusive)
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

    // Sin fechas seleccionadas: navegar sin query params
    this.router.navigate(['/reservas', this.rental._id]);
  }

  // ===== Aviso y Términos desde el Footer (opción 2) =====
  abrirAviso() {
    if (this.footer?.mostrarAviso) {
      this.footer.mostrarAviso();
    } else {
      // Fallback por si no existe el método
      this.general.alert('Aviso de Privacidad', 'Contenido…', 'info');
    }
  }

  abrirTerminos() {
    const anyFooter = this.footer as any;
    if (anyFooter?.mostrarTerminos) {
      anyFooter.mostrarTerminos();
    } else {
      // Fallback
      this.general.alert('Términos y condiciones', 'Contenido…', 'info');
    }
  }
}
