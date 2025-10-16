import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RentaService } from '../../services/renta.service';
import { ReservaService, CreateBookingResponse } from '../../services/reserva.service';
import { GeneralService } from '../../services/general.service';
import { take } from 'rxjs/operators';

function toYMDLocal(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYMDLocal(s: string): Date {
  const [y, m, d] = (s || '').slice(0, 10).split('-').map(Number);
  return new Date(y, (m - 1), d);
}

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function ymdToUtcNoonISO(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m - 1), d, 12, 0, 0));
  return dt.toISOString();
}

function minHoy(c: AbstractControl): ValidationErrors | null {
  const v = c.value as string | null;
  if (!v) return null;
  const hoy = parseYMDLocal(toYMDLocal(new Date()));
  const d = parseYMDLocal(v);
  return d < hoy ? { minHoy: true } : null;
}

function rangoFechas(group: AbstractControl): ValidationErrors | null {
  const ini = group.get('fechaInicio')?.value as string | null;
  const fin = group.get('fechaFin')?.value as string | null;
  if (!ini || !fin) return null;
  const i = parseYMDLocal(ini);
  const f = parseYMDLocal(fin);
  return f < i ? { rangoInvalido: true } : null;
}

@Component({
  selector: 'app-reservas',
  templateUrl: './reservas.page.html',
  styleUrls: ['./reservas.page.scss'],
  standalone: false,
})
export class ReservasPage implements OnInit {
  carId!: string;
  coche: any | null = null;
  form!: FormGroup;
  total = 0;
  dias = 1;
  enviando = false;

  // Días bloqueados (YYYY-MM-DD)
  ocupadasISO = new Set<string>();

  // Rango elegido por el usuario (highlight rojo)
  rangeValue: string[] = [];
  highlightedRange: Array<{ date: string; textColor?: string; backgroundColor?: string }> = [];

  // Highlights grises para días bloqueados
  highlightedDisabled: Array<{ date: string; textColor?: string; backgroundColor?: string }> = [];

  // Para forzar re-montaje del ion-datetime
  showCalendar = true;

  // 🔒 Nuevo: sólo calculamos cuando el usuario toque el calendario aquí
  private userInteracted = false;

  private prevRendered = new Set<string>();
  private suppressDupUntil = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private rentaService: RentaService,
    private reservaService: ReservaService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private general: GeneralService
  ) { }

  ngOnInit(): void {
    this.carId = this.route.snapshot.paramMap.get('id') || '';
    this.initForm();

    // ❌ Ignoramos params de renta-ficha para arrancar en blanco
    // const qp = this.route.snapshot.queryParamMap;
    // if (qp.get('inicio')) this.form.patchValue({ fechaInicio: qp.get('inicio') });
    // if (qp.get('fin')) this.form.patchValue({ fechaFin: qp.get('fin') });

    // Suscripción gateada: no calcula hasta interacción local
    this.form.valueChanges.subscribe(() => {
      if (!this.userInteracted) return;
      this.recalc();
      this.syncRangeFromForm();
      this.validarMinDiasYDisponibilidad();
      this.buildHighlightedRange();
    });

    // Arranca limpio
    this.form.reset({ fechaInicio: null, fechaFin: null, notasCliente: '' }, { emitEvent: false });
    this.rangeValue = [];
    this.highlightedRange = [];
    this.prevRendered = new Set(this.rangeValue);

    this.buildDisabledHighlights(); // inicial
    this.loadCar();                 // carga coche y bloqueos
  }

  private initForm() {
    this.form = this.fb.group(
      {
        fechaInicio: [null, [Validators.required, minHoy]],
        fechaFin: [null],
        notasCliente: [''],
      },
      { validators: [rangoFechas] }
    );
  }

  private async loadCar() {
    const loading = await this.loadingCtrl.create({ message: 'Cargando coche...' });
    await loading.present();

    this.rentaService.cochePorId(this.carId).subscribe({
      next: async (coche) => {
        this.coche = coche;

        // Excepciones -> bloqueados
        this.rentaService
          .diasNoDisponibles(this.carId)
          .pipe(take(1))
          .subscribe((dias: string[]) => {
            const nuevo = new Set(this.ocupadasISO);
            for (const ymd of dias) nuevo.add(ymd);
            this.ocupadasISO = nuevo;

            this.buildDisabledHighlights();
            // NO calculamos nada del resumen hasta interacción local
            this.forceCalendarRerender();
          });

        // (opcional) Días ocupados por reservas si tu servicio los provee
        try {
          const maybe$ = (this.rentaService as any)?.fechasOcupadas?.(this.carId);
          if (maybe$?.subscribe) {
            maybe$.pipe(take(1)).subscribe((arrYMD: string[]) => {
              if (Array.isArray(arrYMD)) {
                const nuevo = new Set(this.ocupadasISO);
                for (const s of arrYMD) nuevo.add(String(s).slice(0, 10));
                this.ocupadasISO = nuevo;

                this.buildDisabledHighlights();
                this.forceCalendarRerender();
              }
            });
          }
        } catch {/* noop */ }

        await loading.dismiss();
        // NO recalc aquí (evitamos influir el resumen sin interacción)
      },
      error: async () => {
        await loading.dismiss();
        this.toast('No se pudo cargar el coche');
        this.router.navigateByUrl('/');
      },
    });
  }

  get minStart(): string {
    return toYMDLocal(new Date());
  }

  // Deshabilita días bloqueados
  isDateEnabled = (isoDateString: string): boolean => {
    try {
      const ymd = (isoDateString || '').slice(0, 10);
      return !this.ocupadasISO.has(ymd);
    } catch {
      return true;
    }
  };

  // Highlights grises para días bloqueados
  private buildDisabledHighlights(): void {
    const bg = '#e5e7eb'; // gris claro
    const fg = '#6b7280'; // texto gris medio
    this.highlightedDisabled = Array.from(this.ocupadasISO).map((ymd) => ({
      date: ymd,
      backgroundColor: bg,
      textColor: fg,
    }));
  }

  // Combinar bloqueados (gris) + rango seleccionado (rojo)
  get mergedHighlights() {
    return [...this.highlightedDisabled, ...this.highlightedRange];
  }

  private forceCalendarRerender() {
    this.showCalendar = false;
    setTimeout(() => (this.showCalendar = true), 0);
  }

  private diffDaysInclusiveLocal(i: Date, f: Date): number {
    const si = startOfDayLocal(i).getTime();
    const sf = startOfDayLocal(f).getTime();
    const excl = Math.ceil((sf - si) / 86400000);
    return Math.max(1, excl + 1);
  }

  private recalc() {
    if (!this.coche) return;

    const inicio = this.form.get('fechaInicio')?.value as string | null;
    const fin = this.form.get('fechaFin')?.value as string | null;
    const finUsado = fin || inicio;

    if (inicio) {
      const i = parseYMDLocal(inicio);
      const f = parseYMDLocal(finUsado || inicio);
      this.dias = this.diffDaysInclusiveLocal(i, f);
    } else {
      this.dias = 1;
    }

    const porDia = Number(
      this.coche?.precio?.porDia ??
      this.coche?.precioPorDia ??
      this.coche?.precio ??
      0
    );
    this.total = porDia * (this.dias || 1);
  }

  private rangoTieneOcupadas(iniStr?: string | null, finStr?: string | null): boolean {
    if (!iniStr) return false;
    let start = parseYMDLocal(iniStr);
    let end = parseYMDLocal(finStr || iniStr);
    if (end < start) [start, end] = [end, start];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (this.ocupadasISO.has(toYMDLocal(d))) return true;
    }
    return false;
  }

  private validarMinDiasYDisponibilidad() {
    const ini = this.form.get('fechaInicio')?.value as string | null;
    const fin = (this.form.get('fechaFin')?.value as string | null) ?? ini;
    const minDias = Number(this.coche?.minDias || 1);

    const errors = { ...(this.form.errors || {}) } as any;
    delete errors.minDias;
    delete errors.rangoOcupado;

    if (ini && this.dias < minDias) errors['minDias'] = true;
    if (ini && this.rangoTieneOcupadas(ini, fin)) errors['rangoOcupado'] = true;

    this.form.setErrors(Object.keys(errors).length ? errors : null);
  }

  private syncRangeFromForm() {
    const ini = this.form.get('fechaInicio')?.value;
    const fin = this.form.get('fechaFin')?.value;
    this.rangeValue = [ini, fin].filter(Boolean) as string[];
  }

  onRangeChange(ev: CustomEvent) {
    // 👇 marca interacción local
    this.userInteracted = true;
    this.handlePick(ev?.detail?.value);
  }

  onRangeValueChange(ev: any) {
    // 👇 marca interacción local
    this.userInteracted = true;
    this.handlePick(Array.isArray(ev) ? ev : (ev?.detail?.value ?? ev));
  }

  private normalizeMulti(val: string[] | string | null | undefined): string[] {
    const raw = Array.isArray(val) ? val : (val ? [val] : []);
    const out: string[] = [];
    for (const s of raw) {
      const ymd = String(s).slice(0, 10);
      if (!out.includes(ymd)) out.push(ymd);
    }
    return out;
  }

  private sameSet(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const A = new Set(a),
      B = new Set(b);
    for (const x of A) if (!B.has(x)) return false;
    return true;
  }

  private handlePick(val: string[] | string | null | undefined) {
    const now = Date.now();
    if (now < this.suppressDupUntil) return;

    const arr = this.normalizeMulti(val);
    if (this.sameSet(arr, this.rangeValue)) return;

    const newSet = new Set(arr);
    let lastTouched: string | null = null;
    let isRemoval = false;

    for (const d of newSet) {
      if (!this.prevRendered.has(d)) {
        lastTouched = d;
        isRemoval = false;
        break;
      }
    }
    if (!lastTouched) {
      for (const d of this.prevRendered) {
        if (!newSet.has(d)) {
          lastTouched = d;
          isRemoval = true;
          break;
        }
      }
    }
    if (!lastTouched && arr.length) lastTouched = arr[arr.length - 1];

    this.applyTouchedInteractive(lastTouched, isRemoval, arr);
    this.prevRendered = new Set(this.rangeValue);
    this.suppressDupUntil = Date.now() + 60;
  }

  private applyTouchedInteractive(last: string | null, isRemoval: boolean, arrNow: string[]) {
    if (!last) return;

    const curStart = this.form.get('fechaInicio')?.value as string | null;
    const curEnd = this.form.get('fechaFin')?.value as string | null;
    let newStart: string | null = curStart ?? null;
    let newEnd: string | null = curEnd ?? null;

    if (isRemoval) {
      const arr = [...arrNow].sort();
      if (arr.length === 0) {
        newStart = null;
        newEnd = null;
      } else if (arr.length === 1) {
        newStart = arr[0];
        newEnd = null;
      } else {
        newStart = arr[0];
        newEnd = arr[arr.length - 1];
      }
    } else {
      if (!curStart) {
        newStart = last;
        newEnd = null;
      } else if (curStart && !curEnd) {
        const s = parseYMDLocal(curStart);
        const L = parseYMDLocal(last);
        if (+L < +s) {
          newStart = last;
          newEnd = curStart;
        } else {
          newStart = curStart;
          newEnd = last;
        }
      } else {
        const s = parseYMDLocal(curStart!);
        const e = parseYMDLocal(curEnd!);
        const L = parseYMDLocal(last);

        if (+L < +s) {
          newStart = last;
        } else if (+L > +e) {
          newEnd = last;
        } else {
          const distS = Math.abs(+L - +s);
          const distE = Math.abs(+e - +L);
          if (distS <= distE) newStart = last;
          else newEnd = last;
        }
      }
    }

    if (newStart && newEnd) {
      const si = parseYMDLocal(newStart);
      const ei = parseYMDLocal(newEnd);
      if (+ei < +si) {
        const tmp = newStart;
        newStart = newEnd;
        newEnd = tmp;
      }
    }

    // A partir de aquí (interacción local) sí calculamos
    this.form.patchValue({ fechaInicio: newStart, fechaFin: newEnd ?? null }, { emitEvent: true });
  }

  private buildHighlightedRange(): void {
    this.highlightedRange = [];

    const ini = this.form.get('fechaInicio')?.value as string | null;
    const fin0 = (this.form.get('fechaFin')?.value as string | null) ?? ini;

    if (!ini) return;
    let i = parseYMDLocal(ini);
    let f = parseYMDLocal(fin0!);
    if (f < i) [i, f] = [f, i];

    const bg = '#e11d2f';
    const fg = '#ffffff';

    const cur = new Date(i);
    while (cur <= f) {
      this.highlightedRange.push({
        date: toYMDLocal(cur),
        backgroundColor: bg,
        textColor: fg,
      });
      cur.setDate(cur.getDate() + 1);
    }
  }

  async reservar() {
    // 🚫 Hasta que el usuario interactúe aquí
    if (!this.userInteracted) {
      this.toast('Selecciona las fechas de tu reserva.');
      return;
    }

    if (!this.canSubmit || !this.coche || this.enviando) {
      if (!this.enviando) {
        this.form.markAllAsTouched();
        this.toast('Completa el formulario.');
      }
      return;
    }

    this.enviando = true;
    let { fechaInicio, fechaFin, notasCliente } = this.form.value as {
      fechaInicio: string;
      fechaFin: string | null;
      notasCliente: string;
    };
    if (fechaInicio && !fechaFin) fechaFin = fechaInicio;

    const minDias = Number(this.coche?.minDias || 1);
    if (this.dias < minDias) {
      this.enviando = false;
      this.toast(`Debes reservar al menos ${minDias} día(s).`);
      return;
    }
    if (this.rangoTieneOcupadas(fechaInicio, fechaFin)) {
      this.enviando = false;
      this.toast('Tu rango incluye días no disponibles.');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Creando reserva...' });
    await loading.present();
    const fechaInicioISO = ymdToUtcNoonISO(fechaInicio);
    const fechaFinISO = ymdToUtcNoonISO(fechaFin!);

    this.reservaService
      .createBookingV2({
        rentalCar: this.coche._id,
        fechaInicio: fechaInicioISO,
        fechaFin: fechaFinISO,
        items: [],
        moneda: this.coche?.precio?.moneda ?? 'MXN',
        notasCliente,
        politicaCancelacion: 'flex',
        aceptoTerminos: true,
      })
      .subscribe({
        next: async (_res: CreateBookingResponse) => {
          await loading.dismiss();
          this.enviando = false;
          this.general.alert(
            '¡Renta creada!',
            `Tu reserva fue creada correctamente. Espera a que el dueño acepte la solicitud para continuar.`,
            'success'
          );
          this.router.navigate(['/']);
        },
        error: async (_e: any) => {
          await loading.dismiss();
          this.enviando = false;
          // El service ya muestra la alerta con el detalle del backend.
        },
      });
  }

  async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2200, position: 'bottom' });
    await t.present();
  }

  get canSubmit(): boolean {
    // 🚫 No habilitar hasta interacción local
    if (!this.userInteracted) return false;

    const ini = this.form.value.fechaInicio as string | null;
    const fin = (this.form.value.fechaFin as string | null) ?? ini;
    if (!ini) return false;

    const i = parseYMDLocal(ini);
    const f = parseYMDLocal(fin!);
    const hoy = parseYMDLocal(toYMDLocal(new Date()));

    const inicioOk = i.getTime() >= hoy.getTime();
    const rangoOk = f.getTime() >= i.getTime();
    const extraOk = !this.form.hasError('minDias') && !this.form.hasError('rangoOcupado');

    return inicioOk && rangoOk && extraOk;
  }

  volver() { history.back(); }
  cerrar() { this.router.navigateByUrl('/'); }
}