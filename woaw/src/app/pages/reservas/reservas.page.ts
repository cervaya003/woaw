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
   Validadores personalizados
   ============================ */
function minHoy(c: AbstractControl): ValidationErrors | null {
  const v = c.value;
  if (!v) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(v); d.setHours(0, 0, 0, 0);
  return d < hoy ? { minHoy: true } : null;
}

function rangoFechas(group: AbstractControl): ValidationErrors | null {
  const ini = group.get('fechaInicio')?.value;
  const fin = group.get('fechaFin')?.value;
  if (!ini || !fin) return null; // permite 1 solo día
  const i = new Date(ini);
  const f = new Date(fin);
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

  // Fechas ocupadas (YYYY-MM-DD) para deshabilitar en ion-datetime
  ocupadasISO = new Set<string>();

  // Valor que refleja la selección del ion-datetime (rango)
  rangeValue: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private rentaService: RentaService,        // coches
    private reservaService: ReservaService,    // bookings
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  ngOnInit(): void {
    this.carId = this.route.snapshot.paramMap.get('id') || '';

    this.initForm();

    // Prefill por query params
    const qp = this.route.snapshot.queryParamMap;
    const inicioQP = qp.get('inicio');
    const finQP = qp.get('fin');
    if (inicioQP) this.form.patchValue({ fechaInicio: inicioQP });
    if (finQP) this.form.patchValue({ fechaFin: finQP });

    this.syncRangeFromForm();
    this.loadCar();

    this.form.valueChanges.subscribe(() => {
      this.recalc();
      this.syncRangeFromForm();
    });
  }

  private initForm() {
    this.form = this.fb.group(
      {
        fechaInicio: [null, [Validators.required, minHoy]],
        // fechaFin SIN required para permitir 1 solo día
        fechaFin: [null],
        notasCliente: [''],
        aceptoTerminos: [false, Validators.requiredTrue],
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

        // (Opcional) Fechas ocupadas
        try {
          const maybe$ = (this.rentaService as any)?.fechasOcupadas?.(this.carId);
          if (maybe$?.subscribe) {
            maybe$.subscribe((arrYMD: string[]) => {
              if (Array.isArray(arrYMD)) this.ocupadasISO = new Set(arrYMD);
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
  private toYMD(d: string | Date): string {
    return new Date(d).toISOString().slice(0, 10);
  }

  get minStart(): string {
    return this.toYMD(new Date());
  }

  get minEnd(): string {
    const inicio = this.form?.get('fechaInicio')?.value;
    return this.toYMD(inicio || new Date());
  }

  isDateEnabled = (isoDateString: string): boolean => {
    try {
      const ymd = new Date(isoDateString).toISOString().slice(0, 10);
      return !this.ocupadasISO.has(ymd);
    } catch {
      return true;
    }
  };

  private recalc() {
    if (!this.coche) return;

    const inicio = this.form.get('fechaInicio')?.value;
    const fin = this.form.get('fechaFin')?.value;
    const finUsado = fin || inicio; // single-day: fin = inicio

    // días (mínimo 1 si hay inicio)
    if (inicio) {
      const i = new Date(inicio);
      const f = new Date(finUsado || inicio);
      const ms = f.getTime() - i.getTime();
      const d = Math.ceil(ms / 86_400_000);
      this.dias = Math.max(1, d || 1);
    } else {
      this.dias = 1;
    }

    const porDia = this.coche?.precio?.porDia ?? this.coche?.precioPorDia ?? 0;
    const dias = this.dias || 1;
    this.total = (porDia || 0) * dias;
  }

  // ====== Calendario único (rango) ======
  private syncRangeFromForm() {
    const ini = this.form.get('fechaInicio')?.value;
    const fin = this.form.get('fechaFin')?.value;
    const arr = [ini, fin].filter(Boolean) as string[];
    this.rangeValue = arr.length ? arr : (ini ? [ini] : []);
  }

  /** Handler por ionChange (algunas versiones lo disparan) */
  onRangeChange(ev: CustomEvent) {
    this.applyPicked(ev?.detail?.value as any);
  }

  /** Handler por ionValueChange (más confiable en varias versiones) */
  onRangeValueChange(ev: any) {
    const value = Array.isArray(ev) ? ev : (ev?.detail?.value ?? ev);
    this.applyPicked(value);
  }

  /** Normaliza el valor del datetime y lo aplica al form */
  private applyPicked(val: string[] | string | null | undefined) {
    const arr = Array.isArray(val) ? val : (val ? [val] : []);
    const picked = [...new Set(arr)]
      .slice(0, 2)
      .sort((a, b) => +new Date(a) - +new Date(b));

    if (picked.length === 0) {
      this.form.patchValue({ fechaInicio: null, fechaFin: null }, { emitEvent: true });
    } else if (picked.length === 1) {
      this.form.patchValue({ fechaInicio: picked[0], fechaFin: null }, { emitEvent: true });
    } else {
      this.form.patchValue({ fechaInicio: picked[0], fechaFin: picked[1] }, { emitEvent: true });
    }

    // Revalida el grupo (rangoFechas)
    this.form.updateValueAndValidity({ onlySelf: false, emitEvent: true });
    this.syncRangeFromForm();
  }

  // ====== Submit ======
  async reservar() {
    if (!this.canSubmit || !this.coche || this.enviando) {
      if (!this.enviando) this.toast('Completa el formulario.');
      return;
    }

    this.enviando = true;

    // Single-day: si fin está vacío, usamos inicio
    let { fechaInicio, fechaFin, notasCliente, aceptoTerminos } = this.form.value;
    if (fechaInicio && !fechaFin) fechaFin = fechaInicio;

    const loading = await this.loadingCtrl.create({ message: 'Creando reserva...' });
    await loading.present();

    this.reservaService.createBookingV2({
      rentalCar: this.coche._id,
      fechaInicio,
      fechaFin,
      items: [],
      moneda: this.coche?.precio?.moneda ?? 'MXN',
      notasCliente,
      politicaCancelacion: 'flex',
      aceptoTerminos,
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
    const fin = (this.form.value.fechaFin as string | null) ?? ini; // 1 día permitido
    const tycOk = this.form.value.aceptoTerminos === true;

    if (!ini || !tycOk) return false;

    const i = new Date(ini);
    const f = new Date(fin!);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const inicioOk = i.getTime() >= hoy.getTime();
    const rangoOk = f.getTime() >= i.getTime();

    return inicioOk && rangoOk;
  }

  volver() { history.back(); }
  cerrar() { this.router.navigateByUrl('/'); }
}
