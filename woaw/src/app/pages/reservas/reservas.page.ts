import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  LoadingController,
  ToastController,
} from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RentaService } from '../../services/renta.service';
import { ReservaService, CreateBookingResponse } from '../../services/reserva.service';

/* ============================
   Helpers de fecha (LOCAL, sin TZ)
   ============================ */
function toYMDLocal(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`; // yyyy-mm-dd (local)
}

function parseYMDLocal(s: string): Date {
  const [y, m, d] = (s || '').slice(0, 10).split('-').map(Number);
  return new Date(y, (m - 1), d); // fecha local 00:00
}

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** ✅ NUEVO: de 'YYYY-MM-DD' (local) a ISO con mediodía en UTC */
function ymdToUtcNoonISO(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m - 1), d, 12, 0, 0)); // 12:00Z para evitar “día anterior” en MX
  return dt.toISOString();
}

/* ============================
   Validadores personalizados (LOCAL)
   ============================ */
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
  if (!ini || !fin) return null; // permite 1 solo día
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

  // Fechas ocupadas (YYYY-MM-DD)
  ocupadasISO = new Set<string>();
  // Valor del ion-datetime (arreglo de YYYY-MM-DD)
  rangeValue: string[] = [];
  // Rango resaltado
  highlightedRange: Array<{ date: string; textColor?: string; backgroundColor?: string }> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private rentaService: RentaService,
    private reservaService: ReservaService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit(): void {
    this.carId = this.route.snapshot.paramMap.get('id') || '';
    this.initForm();

    // Prefill query params
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('inicio')) this.form.patchValue({ fechaInicio: qp.get('inicio') });
    if (qp.get('fin')) this.form.patchValue({ fechaFin: qp.get('fin') });

    this.syncRangeFromForm();
    this.buildHighlightedRange();
    this.loadCar();

    this.form.valueChanges.subscribe(() => {
      this.recalc();
      this.syncRangeFromForm();
      this.validarMinDiasYDisponibilidad();
      this.buildHighlightedRange();
    });
  }

  private initForm() {
    this.form = this.fb.group(
      {
        fechaInicio: [null, [Validators.required, minHoy]],
        fechaFin: [null], // no required (permite 1 solo día)
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

        try {
          const maybe$ = (this.rentaService as any)?.fechasOcupadas?.(this.carId);
          if (maybe$?.subscribe) {
            maybe$.subscribe((arrYMD: string[]) => {
              if (Array.isArray(arrYMD)) {
                this.ocupadasISO = new Set(arrYMD);
                this.validarMinDiasYDisponibilidad();
              }
            });
          }
        } catch { /* noop */ }

        await loading.dismiss();
        this.recalc();
      },
      error: async () => {
        await loading.dismiss();
        this.toast('No se pudo cargar el coche');
        this.router.navigateByUrl('/');
      }
    });
  }

  // ====== Cálculos ======
  get minStart(): string {
    return toYMDLocal(new Date()); // hoy (local) como min
  }

  isDateEnabled = (isoDateString: string): boolean => {
    try {
      const ymd = (isoDateString || '').slice(0, 10); // tratar como YYYY-MM-DD
      return !this.ocupadasISO.has(ymd);
    } catch {
      return true;
    }
  };

  /** Diferencia INCLUSIVA en días (inicio y fin cuentan) */
  private diffDaysInclusiveLocal(i: Date, f: Date): number {
    const si = startOfDayLocal(i).getTime();
    const sf = startOfDayLocal(f).getTime();
    const excl = Math.ceil((sf - si) / 86_400_000);
    return Math.max(1, excl + 1);
  }

  private recalc() {
    if (!this.coche) return;

    const inicio = this.form.get('fechaInicio')?.value as string | null;
    const fin = this.form.get('fechaFin')?.value as string | null;
    const finUsado = fin || inicio; // 1 día si no hay fin

    if (inicio) {
      const i = parseYMDLocal(inicio);
      const f = parseYMDLocal(finUsado || inicio);
      this.dias = this.diffDaysInclusiveLocal(i, f); // inclusivo
    } else {
      this.dias = 1;
    }

    const porDia = Number(this.coche?.precio) || 0;
    this.total = porDia * (this.dias || 1);
  }

  // ====== Validaciones extra ======
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

  // ====== Calendario ======
  private syncRangeFromForm() {
    const ini = this.form.get('fechaInicio')?.value;
    const fin = this.form.get('fechaFin')?.value;
    this.rangeValue = [ini, fin].filter(Boolean) as string[];
  }

  onRangeChange(ev: CustomEvent) {
    this.applyPicked(ev?.detail?.value as any);
  }
  onRangeValueChange(ev: any) {
    const value = Array.isArray(ev) ? ev : (ev?.detail?.value ?? ev);
    this.applyPicked(value);
  }

  private applyPicked(val: string[] | string | null | undefined) {
    const arr = Array.isArray(val) ? val : (val ? [val] : []);
    const picked = [...new Set(arr)]
      .slice(0, 2)
      .sort((a, b) => +parseYMDLocal(a) - +parseYMDLocal(b));

    if (picked.length === 0) {
      this.form.patchValue({ fechaInicio: null, fechaFin: null });
    } else if (picked.length === 1) {
      this.form.patchValue({ fechaInicio: picked[0], fechaFin: null });
    } else {
      this.form.patchValue({ fechaInicio: picked[0], fechaFin: picked[1] });
    }

    this.form.updateValueAndValidity();
    this.syncRangeFromForm();
    this.validarMinDiasYDisponibilidad();
    this.buildHighlightedRange();
  }

  /** ==== Highlight (rango inclusivo, LOCAL) ==== */
  private buildHighlightedRange(): void {
    this.highlightedRange = [];

    const ini = this.form.get('fechaInicio')?.value as string | null;
    const fin0 = (this.form.get('fechaFin')?.value as string | null) ?? ini;

    if (!ini) return;
    let i = parseYMDLocal(ini);
    let f = parseYMDLocal(fin0!);
    if (f < i) [i, f] = [f, i];

    const bg = '#4744efff';  // azul
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

  // ====== Submit ======
  async reservar() {
    if (!this.canSubmit || !this.coche || this.enviando) {
      if (!this.enviando) this.toast('Completa el formulario.');
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

    // ✅ Enviar al backend con hora fija 12:00Z para que NO se recorra un día
    const fechaInicioISO = ymdToUtcNoonISO(fechaInicio);
    const fechaFinISO = ymdToUtcNoonISO(fechaFin!);

    this.reservaService.createBookingV2({
      rentalCar: this.coche._id,
      fechaInicio: fechaInicioISO,   // ISO 12:00Z
      fechaFin: fechaFinISO,         // ISO 12:00Z
      items: [],
      moneda: this.coche?.precio?.moneda ?? 'MXN',
      notasCliente,
      politicaCancelacion: 'flex',
      aceptoTerminos: true,
    }).subscribe({
      next: async (res: CreateBookingResponse) => {
        await loading.dismiss();
        this.enviando = false;
        const alert = await this.alertCtrl.create({
          header: 'Reserva creada',
          message: `Código: <b>${res?.booking?.codigo || '—'}</b>`,
          buttons: ['OK'],
        });
        await alert.present();
        this.router.navigate(['/']);
      },
      error: async (e: any) => {
        await loading.dismiss();
        this.enviando = false;
        this.toast(e?.message || 'Error al crear la reserva.');
      }
    });
  }

  // ====== UX ======
  async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2200, position: 'bottom' });
    await t.present();
  }

  get canSubmit(): boolean {
    const ini = this.form.value.fechaInicio as string | null;
    const fin = (this.form.value.fechaFin as string | null) ?? ini;
    if (!ini) return false;

    const i = parseYMDLocal(ini);
    const f = parseYMDLocal(fin!);
    const hoy = parseYMDLocal(toYMDLocal(new Date()));

    const inicioOk = i.getTime() >= hoy.getTime();   // hoy permitido
    const rangoOk = f.getTime() >= i.getTime();
    const extraOk = !this.form.hasError('minDias') && !this.form.hasError('rangoOcupado');

    return inicioOk && rangoOk && extraOk;
  }

  volver() { history.back(); }
  cerrar() { this.router.navigateByUrl('/'); }
}
