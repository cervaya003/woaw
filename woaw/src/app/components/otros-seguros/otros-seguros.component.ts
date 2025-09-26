import { Component, OnInit, OnChanges, Input, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

type Maybe<T> = T | null | undefined;

interface CotizacionVM {
  plan?: string;
  total?: number; // opcional
  pagos?: string;
  vigencia?: { start?: string; end?: string };
  vehiculo?: string; // opcional
  policyNumbers?: string; // opcional (para la forma nueva)
}

@Component({
  selector: 'app-otros-seguros',
  templateUrl: './otros-seguros.component.html',
  styleUrls: ['./otros-seguros.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class OtrosSegurosComponent implements OnInit, OnChanges {
  @Input() refreshKey = 0;
  cotizacionVM: Maybe<CotizacionVM> = null;

  cards = [
    { nombre: 'Cotización', estatus: false, icon: 'calculator-outline', key: 'cotizacion' },
    { nombre: 'Mis Datos', estatus: false, icon: 'person-outline', key: 'datos' },
    { nombre: 'Póliza', estatus: false, icon: 'document-text-outline', key: 'poliza' }
  ];

  usuarioVM: Maybe<{
    nombre: string;
    rfc: string;
    email?: string;
    phone?: string;
    direccion?: string; // "Olmo 033, Alamos, 76148, Qro"
  }> = null;

  polizaVM: Maybe<{
    rfc: string;
    vin?: string;
    placas?: string;
    color?: string;
    quotationId?: string;
    planId?: string;
    inicio?: string;
  }> = null;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.updateFromStorage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshKey']) {
      this.updateFromStorage();
    }
  }

  private updateFromStorage(): void {
    const cotizacionRaw = localStorage.getItem('cotizacion');
    const datosUsuarioRespuesta = localStorage.getItem('UsuarioRespuesta');
    const datosPoliza = localStorage.getItem('datosPolizaVin_Respuesta');

    console.log(datosPoliza)

    const cotizacionExiste = this.hasValue(cotizacionRaw);
    const datosUsuariosRespuesta = this.hasValue(datosUsuarioRespuesta);
    const datosPolizaRespuesta = this.hasValue(datosPoliza);

    this.setEstatus('Cotización', cotizacionExiste);
    this.setEstatus('Mis Datos', datosUsuariosRespuesta);
    this.setEstatus('Póliza', datosPolizaRespuesta);

    // Construir VMs
    this.cotizacionVM = cotizacionExiste ? this.buildCotizacionVM(cotizacionRaw!) : null;
    this.usuarioVM = datosUsuariosRespuesta ? this.buildUsuarioVM(datosUsuarioRespuesta!) : null;
    this.polizaVM = datosPolizaRespuesta ? this.buildPolizaVM(datosPoliza!) : null;

    this.cdr.markForCheck?.();
  }

  private setEstatus(nombre: string, estatus: boolean): void {
    const i = this.cards.findIndex(c => c.nombre === nombre);
    if (i !== -1) this.cards[i].estatus = estatus;
  }

  private hasValue(v: string | null): boolean {
    return v !== null && v !== '' && v !== 'null' && v !== 'undefined';
  }

  private buildCotizacionVM(json: string) {
    try {
      const raw = JSON.parse(json);

      // Forma NUEVA: { ok, response: { policies[], files[] } }
      const r = raw?.response;
      if (r?.policies?.length) {
        // Elige la póliza "principal" (COMERCIAL_ANUAL si existe, si no la primera)
        const principal =
          r.policies.find((p: any) => p?.policy_type?.id === 'a64c55ab-03bb-4774-89e6-ad69d2362966') ||
          r.policies[0];

        const start = principal?.start_date || r?.policies?.[0]?.start_date || null;
        const end = principal?.end_date || r?.policies?.[0]?.end_date || null;

        const policyNumbers = r.policies
          .map((p: any) => p?.policy_number)
          .filter(Boolean)
          .join(' • ');

        // Map rápido de tipo → nombre “humano”
        const mapTipo = (id?: string) => {
          if (id === 'a64c55ab-03bb-4774-89e6-ad69d2362966') return 'Plan Comercial Anual';
          if (id === 'b6bee0c5-15ae-4ad9-8f6e-c7a0ed021103') return 'Responsabilidad Civil (RCO)';
          return 'Póliza emitida';
        };

        const plan = mapTipo(principal?.policy_type?.id);

        return {
          plan,                    // ej. "Plan Comercial Anual"
          total: undefined,        // la respuesta nueva no trae totales
          pagos: '—',              // no hay plan de pagos aquí
          vigencia: { start, end }, // ISO strings; el date pipe los formatea
          vehiculo: undefined,     // no viene en este payload
          policyNumbers            // extra opcional si quieres mostrarlo
        };
      }

      // Forma VIEJA (cotización completa)
      const data = raw;
      const planObj = data?.plans?.[0];
      const planName = planObj?.name || '—';
      const total = Number(planObj?.total ?? data?.total ?? 0);
      const pagoName = data?.payment_plans?.[0]?.name || 'ANNUAL';
      const vigencia = { start: data?.validity?.start || null, end: data?.validity?.end || null };
      const brand = data?.vehicle?.brand?.name;
      const model = data?.vehicle?.model?.name;
      const year = data?.vehicle?.year?.name;
      const version = data?.vehicle?.version?.name;
      const vehiculo = [this.cap(brand), this.cap(model), year].filter(Boolean).join(' ') + (version ? ` – ${version}` : '');

      return {
        plan: planName,
        total,
        pagos: this.prettyPlan(pagoName),
        vigencia,
        vehiculo: vehiculo || '—'
      };
    } catch {
      return null;
    }
  }

  private buildUsuarioVM(json: string) {
    // "UsuarioRespuesta" llega con { ok, source, code, response: {...} }
    try {
      const wrap = JSON.parse(json);
      const u = wrap?.response ?? {};
      const nombre = [u?.first_name, u?.first_last_name, u?.second_last_name].filter(Boolean).join(' ');
      const rfc = u?.rfc || '—';
      const email = u?.email;
      const phone = u?.phone;

      const a = u?.address;
      const direccion = a
        ? [
          [a?.street, a?.external_number].filter(Boolean).join(' '),
          a?.neighborhood,
          a?.postal_code,
        ].filter(Boolean).join(', ')
        : undefined;

      return { nombre, rfc, email, phone, direccion };
    } catch {
      return null;
    }
  }

  private buildPolizaVM(json: string) {
    // "datosPolizaVin_Respuesta" del ejemplo
    try {
      const data = JSON.parse(json);
      const rfc = data?.rfc || '—';
      const vin = data?.vehicle?.vin;
      const placas = data?.vehicle?.plates;
      const color = data?.vehicle?.color;
      const quotationId = data?.quotation?.id;
      const planId = data?.quotation?.plan_id;
      const inicio = data?.start_date;

      return { rfc, vin, placas, color, quotationId, planId, inicio };
    } catch {
      return null;
    }
  }

  private prettyPlan(name: string): string {
    // ANNUAL | SUBSCRIPTION -> etiquetas amigables
    if (!name) return '—';
    const n = String(name).toUpperCase();
    if (n === 'ANNUAL') return 'Pago anual';
    if (n === 'SUBSCRIPTION') return 'Suscripción mensual (12 pagos)';
    return this.cap(n.toLowerCase());
  }

  private cap(s?: string) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  formatMXN(n?: number): string {
    if (!n || isNaN(n)) return '—';
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
  }
}