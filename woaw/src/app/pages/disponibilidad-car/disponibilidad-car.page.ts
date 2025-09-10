import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { RentaService } from '../../services/renta.service';

type EstadoRenta = 'disponible' | 'inactivo';
type Preset = 'none' | 'week' | 'month' | 'weekdays';

interface ExcepcionNoDisponible {
  inicio: string; // ISO
  fin: string;    // ISO
  motivo?: string;
}

type DayHighlight = { date: string; textColor?: string; backgroundColor?: string };
type ExcepcionDTO = { inicio: any; fin: any; motivo?: string };

@Component({
  selector: 'app-disponibilidad-car',
  templateUrl: './disponibilidad-car.page.html',
  styleUrls: ['./disponibilidad-car.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DisponibilidadCarPage implements OnInit {
  carId!: string;
  coche: any | null = null;

  esPropietario = false;
  estadoActual: EstadoRenta = 'disponible';

  excepciones: ExcepcionNoDisponible[] = [];
  errores: string[] = [];

  // Calendario
  modoSeleccion: 'rango' | 'dia' = 'rango';
  rangeUnified: string[] | string | null = null;
  calendarMounted = true;
  private ignoreNextCalendarChange = false;

  // NEW (p1): límites del calendario
  minDate = this.toYmdLocal(new Date());                       // hoy (local)
  maxDate = this.toYmdLocal(this.addMonths(new Date(), 12));   // +12 meses

  // Preview calendario
  selectionHighlights: DayHighlight[] = [];
  highlightedExcepciones: DayHighlight[] = [];

  // Presets
  activePreset: Preset = 'none';
  // Días fijos: 0=Dom, 1=Lun, ... 6=Sáb
  weekDays = [
    { label: 'L', value: 1 }, { label: 'M', value: 2 }, { label: 'X', value: 3 },
    { label: 'J', value: 4 }, { label: 'V', value: 5 }, { label: 'S', value: 6 },
    { label: 'D', value: 0 },
  ];
  blockedWeekdays: Set<number> = new Set();

  // Helpers
  cargando = false;
  guardando = false;
  private currentUserId: string | null = null;
  private lastSnapshot = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rentaService: RentaService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this.carId = this.route.snapshot.paramMap.get('id')!;
    if (!this.carId) { this.router.navigateByUrl('/renta'); return; }
    this.refreshCurrentUserId();
    this.loadCar();
  }

  // ====== LOAD ======
  private async loadCar() {
    this.cargando = true; this.cdr.markForCheck();
    const loading = await this.loading('Cargando vehículo…');

    this.rentaService.cochePorId(this.carId).subscribe({
      next: async (car) => {
        await loading.dismiss(); this.cargando = false;

        this.coche = car;
        this.estadoActual = (car?.estadoRenta === 'inactivo' ? 'inactivo' : 'disponible');

        const rawEx: ExcepcionDTO[] = (car?.excepcionesNoDisponibles ?? []) as ExcepcionDTO[];
        const ex: ExcepcionNoDisponible[] = rawEx
          .map((e: ExcepcionDTO) => ({
            inicio: this.toISO(e.inicio),
            fin: this.toISO(e.fin),
            motivo: e.motivo || undefined,
          }))
          .filter((e: ExcepcionNoDisponible) => !!e.inicio && !!e.fin);

        this.excepciones = this.mergeRanges(ex);

        // Al cargar, no asumimos preset
        this.activePreset = 'none';
        this.blockedWeekdays.clear();

        // propietario
        const owner = this.extractOwnerId(car);
        const me = this.currentUserId ? String(this.currentUserId) : null;
        this.esPropietario = !!owner && !!me && owner === me;

        this.rebuildCalendarHighlights();
        this.selectionHighlights = [];
        this.recalcularErrores();
        this.lastSnapshot = this.snapshotKey();
        this.cdr.markForCheck();
      },
      error: async (err) => {
        await loading.dismiss();
        this.cargando = false;
        console.error(err);
        this.toast('No se pudo cargar el vehículo', 'danger');
        this.router.navigateByUrl('/renta');
      },
    });
  }

  // ====== ESTADO ======
  async onEstadoChange(ev?: CustomEvent) {
    if (!this.esPropietario) return;
    const nuevo = (ev?.detail?.value as EstadoRenta) ?? this.estadoActual;
    this.estadoActual = nuevo; this.cdr.markForCheck();

    const loading = await this.loading('Actualizando estado…');
    this.rentaService.toggleEstadoRenta(this.carId, nuevo).subscribe({
      next: async () => { await loading.dismiss(); this.toast(`Estado cambiado a "${nuevo}"`, 'success'); },
      error: async (err) => { await loading.dismiss(); console.error(err); this.toast(err?.error?.message || 'Error al cambiar estado', 'danger'); },
    });
  }

  // ====== Selección manual ======
  onUnifiedChange(ev: CustomEvent) {
    if (this.ignoreNextCalendarChange) { this.ignoreNextCalendarChange = false; return; }
    const val = ev?.detail?.value as string[] | string | null | undefined;

    // Si empieza interacción manual, salimos de presets
    this.activePreset = 'none';
    this.blockedWeekdays.clear();

    if (this.modoSeleccion === 'dia') {
      const day = Array.isArray(val) ? val[0] : (val || null);
      this.rangeUnified = day;
      this.setSelectionPreview(day ?? null);
      if (day) this.addExcepcionFromSelection(day, day);
      return;
    }

    const arr = Array.isArray(val) ? val : (val ? [val] : []);
    if (!arr || arr.length === 0) {
      this.rangeUnified = null;
      this.selectionHighlights = [];
      this.cdr.markForCheck(); return;
    }
    const picked = [...arr].slice(0, 2).sort((a, b) => +new Date(a) - +new Date(b));
    this.rangeUnified = picked;
    this.setSelectionPreview(picked[0] ?? null, picked[1] ?? picked[0] ?? null);
    if (picked.length === 2) this.addExcepcionFromSelection(picked[0]!, picked[1]!);
  }

  private addExcepcionFromSelection(inicioISO: string, finISO: string) {
    const s = this.toStartOfDayISO(inicioISO);
    const e = this.toEndOfDayISO(finISO);
    if (!this.rangoOk(s, e)) { this.toast('Rango inválido', 'warning'); return; }
    this.excepciones.push({ inicio: s, fin: e });
    this.excepciones = this.mergeRanges(this.excepciones);
    this.rebuildCalendarHighlights();
    this.resetSelection();
    this.recalcularErrores();
    this.cdr.markForCheck();
  }

  // ====== PRESETS EXCLUSIVOS ======
  applyPreset(preset: Preset) {
    if (!this.esPropietario) return;

    // week/month son exclusivos de weekdays → limpian la selección de días fijos,
    // pero NO borran otras excepciones existentes.
    if (preset === 'week' || preset === 'month') this.blockedWeekdays.clear();

    let newEx: ExcepcionNoDisponible[] = [];
    const now = new Date();

    if (preset === 'week') {
      const start = new Date(now);
      const dow = start.getDay(); // 0=Dom
      const mondayOffset = (dow === 0 ? -6 : 1 - dow);
      start.setDate(start.getDate() + mondayOffset);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      newEx = [{
        inicio: this.toStartOfDayISO(start.toISOString()),
        fin: this.toEndOfDayISO(end.toISOString()),
        motivo: 'Semana actual'
      }];
    }

    if (preset === 'month') {
      const a = new Date(now.getFullYear(), now.getMonth(), 1);
      const b = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      newEx = [{
        inicio: this.toStartOfDayISO(a.toISOString()),
        fin: this.toEndOfDayISO(b.toISOString()),
        motivo: 'Mes actual'
      }];
    }

    if (preset === 'weekdays') {
      // 1) Quita SOLO lo generado previamente por este preset ('Día fijo')
      this.excepciones = this.excepciones.filter(e => e.motivo !== 'Día fijo');

      // 2) Si no hay días seleccionados, no borres más; solo actualiza UI
      if (this.blockedWeekdays.size === 0) {
        this.activePreset = 'none';
        this.rebuildCalendarHighlights();
        this.recalcularErrores();
        this.cdr.markForCheck();
        return;
      }

      // 3) Genera nuevas excepciones para esos días fijos en un horizonte
      const { start, end } = this.getWeekendHorizon(6); // 6 meses
      const dates = this.generateWeekdayDates(start, end, this.blockedWeekdays);
      newEx = dates.map(d => ({
        inicio: this.toStartOfDayISO(d),
        fin: this.toEndOfDayISO(d),
        motivo: 'Día fijo'
      }));
    }

    // Integra SIN perder otras excepciones
    this.excepciones = this.mergeRanges([...this.excepciones, ...newEx]);
    this.activePreset = preset;
    this.rebuildCalendarHighlights();
    this.recalcularErrores();

    this.toast(
      preset === 'week' ? 'Semana bloqueada' :
        preset === 'month' ? 'Mes bloqueado' :
          'Días fijos aplicados',
      'success'
    );
    this.cdr.markForCheck();
  }

  // DÍAS FIJOS (chips)
  isWeekdaySelected(val: number) { return this.blockedWeekdays.has(val); }
  toggleWeekday(val: number) {
    if (!this.esPropietario) return;
    if (this.blockedWeekdays.has(val)) this.blockedWeekdays.delete(val);
    else this.blockedWeekdays.add(val);
    // activar preset weekdays (exclusivo)
    this.applyPreset('weekdays');
  }

  // ====== GUARDAR ======
  async guardar() {
    if (!this.esPropietario) return;

    const excepcionesClean = this.mergeRanges(this.excepciones);
    this.recalcularErrores();
    if (this.errores.length > 0) { this.toast('Corrige los problemas antes de guardar', 'warning'); return; }

    const now = this.snapshotKey(excepcionesClean);
    if (now === this.lastSnapshot) { this.toast('No hay cambios por guardar', 'medium'); return; }

    this.guardando = true; this.cdr.markForCheck();
    const loading = await this.loading('Guardando…');

    this.rentaService.setDisponibilidadCar(this.carId, [], excepcionesClean).subscribe({
      next: async () => {
        this.rentaService.toggleEstadoRenta(this.carId, this.estadoActual).subscribe({
          next: async () => {
            await loading.dismiss();
            this.guardando = false;
            this.lastSnapshot = now;
            this.toast('Cambios guardados', 'success');
            this.loadCar();
            this.router.navigate(['/renta-coches']);
          },
          error: async () => {
            await loading.dismiss(); this.guardando = false;
            this.toast('Guardó excepciones, pero falló el estado', 'danger');
          }
        });
      },
      error: async (err) => {
        await loading.dismiss(); this.guardando = false;
        console.error(err);
        const msg = err?.error?.message || err?.error?.error || 'Error al actualizar';
        this.toast(msg, 'danger');
      },
    });
  }

  // ====== Helpers / Validaciones / Calendario ======
  get estadoColorClass(): string {
    return this.estadoActual === 'disponible' ? 'estado--ok' : 'estado--off';
  }

  private snapshotKey(ex?: ExcepcionNoDisponible[]) {
    return JSON.stringify({ e: this.mergeRanges(ex ?? this.excepciones), estado: this.estadoActual });
  }

  private recalcularErrores() {
    const errs: string[] = [];
    const badE = this.excepciones.filter((e: ExcepcionNoDisponible) => !this.rangoOk(e.inicio, e.fin));
    if (badE.length) errs.push(`Tienes ${badE.length} excepción(es) con rango inválido.`);
    const dupE = this.findOverlaps(this.excepciones);
    if (dupE > 0) errs.push(`Hay ${dupE} traslape(s) entre excepciones.`);
    this.errores = errs;
  }

  private findOverlaps(rangos: Array<{ inicio: string; fin: string }>): number {
    if (!rangos || rangos.length < 2) return 0;
    const sorted = [...rangos].sort((a, b) => +new Date(a.inicio) - +new Date(b.inicio));
    let overlaps = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (new Date(curr.inicio).getTime() < new Date(prev.fin).getTime()) overlaps++;
    }
    return overlaps;
  }

  private rangoOk(a: string, b: string) { return new Date(a).getTime() <= new Date(b).getTime(); }
  private toISO(d: any): string { const t = new Date(d); return isNaN(+t) ? '' : t.toISOString(); }

  private toStartOfDayISO(iso: string) {
    const d = new Date(iso);
    const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
    return utc.toISOString();
  }
  private toEndOfDayISO(iso: string) {
    const d = new Date(iso);
    const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
    return utc.toISOString();
  }

  private formatUtcYmd(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private expandToDateList(inicioISO: string, finISO: string): string[] {
    const out: string[] = [];
    const a = new Date(inicioISO); a.setUTCHours(0, 0, 0, 0);
    const b = new Date(finISO); b.setUTCHours(0, 0, 0, 0);
    let cur = new Date(a);
    while (cur.getTime() <= b.getTime()) {
      out.push(this.formatUtcYmd(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
  }

  // highlights: solo excepciones + preview
  get highlightedCombined() {
    const map = new Map<string, DayHighlight>();
    const lay = (arr: DayHighlight[]) => { for (const d of arr) map.set(d.date, d); };
    lay(this.highlightedExcepciones);
    lay(this.selectionHighlights);
    return Array.from(map.values());
  }

  private rebuildCalendarHighlights() {
    const red = '#ef4444', white = '#ffffff';
    const ex: DayHighlight[] = [];
    for (const e of this.excepciones) {
      for (const d of this.expandToDateList(e.inicio, e.fin))
        ex.push({ date: d, backgroundColor: red, textColor: white });
    }
    const seen = new Set<string>();
    this.highlightedExcepciones = ex.filter(d => !seen.has(d.date) && (seen.add(d.date), true));
  }

  private setSelectionPreview(startISO: string | null, endISO?: string | null) {
    this.selectionHighlights = [];
    if (!startISO) { this.cdr.markForCheck(); return; }
    const s = this.toStartOfDayISO(startISO);
    const e = this.toEndOfDayISO(endISO ?? startISO);
    const days = this.expandToDateList(s, e);
    for (const d of days) this.selectionHighlights.push({ date: d, backgroundColor: '#b91c1c', textColor: '#ffffff' });
    this.cdr.markForCheck();
  }

  // Fechas por días fijos en horizonte
  private isWeekend(d: Date) { const w = d.getUTCDay(); return w === 0 || w === 6; } // (no usado ahora, pero útil)
  private getWeekendHorizon(months = 6) {
    const start = new Date(); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 0, 0, 0, 0));
    return { start, end };
  }
  private generateWeekdayDates(from: Date, to: Date, weekdays: Set<number>): string[] {
    const out: string[] = [];
    const cur = new Date(from);
    while (cur.getTime() <= to.getTime()) {
      if (weekdays.has(cur.getUTCDay())) out.push(cur.toISOString());
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
  }

  // Reset selección al cambiar modo
  resetSelection() {
    this.ignoreNextCalendarChange = false;
    this.rangeUnified = null;
    this.selectionHighlights = [];
    this.calendarMounted = false;
    setTimeout(() => { this.calendarMounted = true; this.cdr.markForCheck(); }, 0);
  }

  // Navegación y utilidades de owner (igual que antes)
  volver() {
    try { if (window.history.length > 2) return history.back(); } catch { }
    this.router.navigate(['/renta-coches']);
  }
  cerrar() { this.volver(); }

  private refreshCurrentUserId() {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        const id = this.firstNonEmpty([u?._id, u?.id, u?.userId, u?.user?._id, u?.user?.id]);
        if (id) { this.currentUserId = this.toIdStr(id); return; }
      }
    } catch { }
    try {
      const t = (localStorage.getItem('token') || '').trim();
      if (t) {
        const bare = t.startsWith('Bearer ') ? t.slice(7) : t;
        const payload = this.decodeJwt(bare);
        const id = this.firstNonEmpty([payload?.sub, payload?.userId, payload?._id, payload?.id, payload?.user?._id, payload?.user?.id]);
        this.currentUserId = id ? this.toIdStr(id) : null;
      }
    } catch { this.currentUserId = null; }
  }
  private extractOwnerId(car: any): string | null {
    const candidates = [car?.propietarioId, car?.propietario?._id, car?.propietario, car?.ownerId, car?.owner?._id, car?.userId, car?.user?._id, car?.createdById, car?.createdBy?._id];
    for (const c of candidates) { const v = this.toIdStr(c); if (v) return v; }
    return null;
  }
  private toIdStr(val: any): string {
    if (val == null) return '';
    if (typeof val === 'object') {
      if ('$oid' in (val as any) && (val as any).$oid) return String((val as any).$oid);
      if ('_id' in (val as any) && (val as any)._id) return this.toIdStr((val as any)._id);
      try { return String((val as any).toString?.() ?? val); } catch { }
    }
    return String(val);
  }
  private firstNonEmpty(arr: any[]) {
    return arr.find((x) => x !== undefined && x !== null && String(x) !== '' && String(x) !== '[object Object]');
  }
  private decodeJwt(token: string): any {
    const part = token.split('.')[1]; if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded); return JSON.parse(json);
  }

  // NEW (p6): proteger salida con cambios sin guardar
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload($event: BeforeUnloadEvent) {
    if (this.snapshotKey() !== this.lastSnapshot) {
      $event.preventDefault();
      $event.returnValue = true;
    }
  }

  private async loading(message: string) {
    const l = await this.loadingCtrl.create({ message }); await l.present(); return l;
  }
  private async toast(message: string, color: 'success' | 'warning' | 'danger' | 'medium' = 'medium') {
    const t = await this.toastCtrl.create({ message, duration: 2500, color }); await t.present();
  }
  async confirm(header: string, message: string): Promise<boolean> {
    const alert = await this.alertCtrl.create({ header, message, buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Aceptar', role: 'confirm' }] });
    await alert.present(); const { role } = await alert.onDidDismiss(); return role === 'confirm';
  }

  trackByRange = (_: number, r: { inicio: string; fin: string }) => `${r.inicio}|${r.fin}`;

  private mergeRanges<T extends { inicio: string; fin: string;[k: string]: any }>(arr: T[]): T[] {
    if (!arr || arr.length === 0) return [];
    const sorted = [...arr].sort((a, b) => +new Date(a.inicio) - +new Date(b.inicio));
    const out: T[] = [];
    let cur = { ...sorted[0] };
    const touchOrOverlap = (aEnd: Date, bStart: Date) => bStart.getTime() <= (aEnd.getTime() + 1);
    for (let i = 1; i < sorted.length; i++) {
      const nxt = sorted[i];
      const curEnd = new Date(cur.fin);
      const nxtStart = new Date(nxt.inicio);
      if (touchOrOverlap(curEnd, nxtStart)) {
        if (new Date(nxt.fin).getTime() > curEnd.getTime()) cur.fin = nxt.fin;
      } else {
        out.push(cur);
        cur = { ...nxt };
      }
    }
    out.push(cur);
    return out;
  }

  // Limpia todas las excepciones (y sale de cualquier preset activo)
  clearExcepciones() {
    this.confirm('Confirmar', '¿Vaciar todas las excepciones?').then(ok => {
      if (!ok) return;

      this.excepciones = [];
      this.activePreset = 'none';     // salimos de cualquier preset
      this.rebuildCalendarHighlights();
      this.recalcularErrores();
      this.cdr.markForCheck();
    });
  }

  // ====== NEW (p1/p2) utilidades min/max y validador de fecha ======
  private addMonths(d: Date, n: number) {
    const x = new Date(d);
    x.setMonth(x.getMonth() + n);
    return x;
  }

  private toYmdLocal(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Evita seleccionar un día ya bloqueado por alguna excepción
  isDateEnabled = (isoDate: string) => {
    const ymd = isoDate.slice(0, 10); // 'YYYY-MM-DD'
    for (const e of this.excepciones) {
      const days = this.expandToDateList(e.inicio, e.fin);
      if (days.includes(ymd)) return false;
    }
    return true;
  };

  // 👇 dentro de la clase DisponibilidadCarPage
  get hasChanges(): boolean {
    return this.snapshotKey() !== this.lastSnapshot;
  }

}
