import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RentaService } from '../../services/renta.service';
import { GeneralService } from '../../services/general.service';

@Component({
  selector: 'app-renta-ficha',
  templateUrl: './renta-ficha.page.html',
  styleUrls: ['./renta-ficha.page.scss'],
  standalone: false,
})
export class RentaFichaPage implements OnInit {
  loading = true;
  rental: any = null;

  // Galería unificada (imagenPrincipal + imagenes[])
  galeria: string[] = [];
  imagenSeleccionada: string | null = null;

  get tieneVarias(): boolean {
    return (this.galeria?.length || 0) > 1;
  }

  // ⭐ Getter para rating
  get ratingEntero(): number {
    const r = Number(this.rental?.ratingPromedio ?? 0);
    return Math.max(0, Math.min(5, Math.round(r)));
  }

  // ===== Selección de fechas con UN solo calendario =====
  minFecha = new Date().toISOString().slice(0, 10); // yyyy-mm-dd (hoy)
  fechasSeleccionadas: string[] = []; // ISO strings (YYYY-MM-DD) de ion-datetime

  // Derivados (inicio/fin) desde el array seleccionado
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
    meses: number;
    semanas: number;
    diasSueltos: number;
    subtotalDia: number;
    subtotalSemana: number;
    subtotalMes: number;
    total: number;
  } | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rentaService: RentaService,
    private general: GeneralService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.cargar(id);
  }

  private buildGaleria(res: any): string[] {
    const principal = res?.imagenPrincipal ? [res.imagenPrincipal] : [];
    const extras = Array.isArray(res?.imagenes) ? res.imagenes : [];
    const limpio = [...principal, ...extras].filter((u: any) => !!u && typeof u === 'string');
    return Array.from(new Set(limpio));
  }

  cargar(id: string) {
    this.loading = true;
    this.rentaService.cochePorId(id).subscribe({
      next: (res) => {
        this.rental = res;
        this.galeria = this.buildGaleria(res);
        this.imagenSeleccionada = this.galeria[0] || null;
        this.loading = false;
        // Recalcular si ya había selección previa (1 o 2 fechas)
        if (this.fechasSeleccionadas.length >= 1) this.calcularTotal();
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message || 'No se pudo cargar el vehículo';
        this.general.alert('Error', msg, 'danger');
        this.router.navigate(['/renta-coches']);
      }
    });
  }

  // Navegación
  volver() {
    try {
      if (window.history.length > 2) return history.back();
    } catch {}
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
  }

  trackByUrl(_i: number, url: string) { return url; }

  // ====== Fechas / Cálculo ======
  onRangoChange() {
    // Mantener máximo 2 selecciones. Si hay más, conservamos las 2 más recientes.
    if (this.fechasSeleccionadas.length > 2) {
      this.fechasSeleccionadas = this.fechasSeleccionadas.slice(-2);
    }
    // Calcular con 1 o 2 fechas
    if (this.fechasSeleccionadas.length >= 1) {
      this.calcularTotal();
    } else {
      this.resumen = null;
    }
  }

  private startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  // Diferencia en días (fin excluyente: si inicio=1 y fin=2 => 1 día)
  private diffDays(inicio: Date, fin: Date): number {
    const ms = this.startOfDay(fin).getTime() - this.startOfDay(inicio).getTime();
    return Math.ceil(ms / 86400000);
  }

  // Deshabilitar fechas fuera de ventanas disponibles o dentro de excepciones
  esFechaHabil = (isoDateString: string) => {
    if (!this.rental) return true;

    const d = this.startOfDay(new Date(isoDateString)).getTime();

    const ventanas = this.rental?.ventanasDisponibles || [];
    let permitidoPorVentana = true;
    if (ventanas.length > 0) {
      permitidoPorVentana = ventanas.some((v: any) => {
        const i = this.startOfDay(new Date(v.inicio)).getTime();
        const f = this.startOfDay(new Date(v.fin)).getTime();
        return d >= i && d <= f;
      });
    }

    const excepciones = this.rental?.excepcionesNoDisponibles || [];
    const enExcepcion = excepciones.some((x: any) => {
      const i = this.startOfDay(new Date(x.inicio)).getTime();
      const f = this.startOfDay(new Date(x.fin)).getTime();
      return d >= i && d <= f;
    });

    return permitidoPorVentana && !enExcepcion;
  };

  // Estrategia: priorizar meses (30 días), luego semanas (7), luego días
  private calcularTotal() {
    this.resumen = null;
    if (!this.rental) return;

    const inicioISO = this.fechaInicio;
    const finISO = this.fechaFin || this.fechaInicio; // si solo hay 1 fecha, usamos la misma
    if (!inicioISO || !finISO) return;

    const inicio = new Date(inicioISO);
    const fin = new Date(finISO);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return;

    // Días: si hay 1 fecha => 1 día. Si hay 2 => diferencia excluyente.
    let dias = this.diffDays(inicio, fin);
    if (this.fechasSeleccionadas.length === 1) {
      dias = 1;
    }
    if (dias <= 0) return;

    const precio = this.rental?.precio || {};
    const porDia = Number(precio.porDia || 0);
    const porSemana = Number(precio.porSemana || 0);
    const porMes = Number(precio.porMes || 0);

    let resta = dias;
    let meses = 0, semanas = 0, diasSueltos = 0;

    if (porMes > 0) {
      meses = Math.floor(resta / 30);
      resta = resta % 30;
    }
    if (porSemana > 0) {
      semanas = Math.floor(resta / 7);
      resta = resta % 7;
    }
    diasSueltos = resta;

    const subtotalMes = meses * porMes;
    const subtotalSemana = semanas * porSemana;
    const subtotalDia = diasSueltos * porDia;

    let total = 0;
    if (!porMes && !porSemana) {
      total = dias * porDia;
    } else {
      total = subtotalMes + subtotalSemana + subtotalDia;
      if (porSemana && !porDia && diasSueltos > 0) {
        total += Math.ceil((porSemana / 7) * diasSueltos);
      }
    }

    this.resumen = {
      valido: true,
      dias,
      meses,
      semanas,
      diasSueltos,
      subtotalDia,
      subtotalSemana,
      subtotalMes,
      total,
    };
  }

  // CTAs
  contactarWhatsApp() {
    const txt = encodeURIComponent(
      `Hola, me interesa rentar el ${this.rental?.marca} ${this.rental?.modelo} ${this.rental?.anio}.`
    );
    window.open(`https://wa.me/?text=${txt}`, '_blank');
  }

  compartir() {
    const url = location.href;
    if (navigator.share) {
      navigator.share({
        title: `${this.rental?.marca} ${this.rental?.modelo} ${this.rental?.anio} en renta`,
        text: 'Checa este vehículo en renta',
        url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      this.general.toast('Enlace copiado', 'success');
    }
  }

  reservar() {
    if (!this.resumen?.valido) {
      this.general.toast('Selecciona 1 fecha o un rango válido', 'warning');
      return;
    }
    this.general.toast(
      `Reserva por ${this.resumen.dias} día(s). Total: ${this.resumen.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`,
      'primary'
    );
  }

  abrirAviso() { this.general.alert('Aviso de Privacidad', 'Contenido…', 'info'); }
  abrirTerminos() { this.general.alert('Términos y condiciones', 'Contenido…', 'info'); }
}
