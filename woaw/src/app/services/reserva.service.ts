import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { HeadersService } from './headers.service';

// ───────── Tipos de Bookings ─────────
export interface BookingFiltro {
  estatus?: 'pendiente' | 'aceptada' | 'en_curso' | 'finalizada' | 'cancelada';
  usuario?: string;
  rentalCar?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
  sort?: string;
  [key: string]: any;
}

export type BookingStatus = 'pendiente' | 'aceptada' | 'en_curso' | 'finalizada' | 'cancelada';

export interface LineItem {
  concepto: string;
  tipo?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Pago {
  estatus: 'no_pagado' | 'preautorizado' | 'pagado' | 'reembolsado';
  metodo?: string;
  referencia?: string;
  monto?: number;
  moneda?: string;
}

export interface Deposito {
  estatus: 'no_aplicado' | 'preautorizado' | 'cobrado' | 'liberado' | 'parcial_retenido';
  referencia?: string;
  monto?: number;
}

export interface CheckInfo {
  fecha?: string;
  combustible?: number;
  fotos?: string[];
  notas?: string;
}

export interface RentalBooking {
  _id: string;
  codigo?: string;
  rentalCar: string;
  usuario: any; // puede venir como string u objeto
  fechaInicio: string;
  fechaFin: string;
  estatus: BookingStatus;
  moneda: string;
  items: LineItem[];
  total: number;
  pago: Pago;
  deposito: Deposito;
  checkIn?: CheckInfo | null;
  checkOut?: CheckInfo | null;
  contratoURL?: string | null;
  politicaCancelacion?: string | null;
  aceptoTerminos: boolean;
  aceptoTerminosFecha?: string | null;
  fechasFlujo?: {
    aceptadaEn?: string;
    inicioReal?: string;
    finReal?: string;
    canceladaEn?: string;
  };
  motivoCancelacion?: string | null;
  notasCliente?: string | null;
  notasOperador?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBookingInput {
  rentalCar: string;
  fechaInicio: string | Date;
  fechaFin: string | Date;
  items?: LineItem[] | string; // permitimos string JSON en UI, lo parseamos
  total?: number;
  moneda?: string;
  notasCliente?: string;
  politicaCancelacion?: string;
  aceptoTerminos: boolean;
}

export interface CreateBookingResponse {
  message: string;
  booking: RentalBooking;
}

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private readonly _baseUrl = this.normalizeBaseUrl(environment.api_key);
  public get baseUrl(): string { return this._baseUrl; }

  /** Prefijo correcto del router de bookings */
  private readonly BOOKING_BASE = '/booking/bookings';

  constructor(
    private http: HttpClient,
    private headersService: HeadersService
  ) { }

  // ───────── helpers base ─────────
  private normalizeBaseUrl(url: string): string {
    return (url || '').replace(/\/+$/, '');
  }

  private toParams(obj: Record<string, any>): HttpParams {
    let params = new HttpParams();
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      if (Array.isArray(v)) v.forEach(item => { params = params.append(k, String(item)); });
      else params = params.set(k, String(v));
    });
    return params;
  }

  private authJsonHeaders$() {
    return from(this.headersService.obtenerToken()).pipe(
      map((token) => this.headersService.getJsonHeaders(token))
    );
  }

  private authMultipartHeaders$() {
    return from(this.headersService.obtenerToken()).pipe(
      map((token) => {
        const h = this.headersService.getJsonHeaders(token) as HttpHeaders;
        // remover Content-Type para que el browser ponga el boundary
        return h.delete('Content-Type');
      })
    );
  }

  // ───────── fallback /api (baseUrl con/sin /api) ─────────
  private buildApiCandidates(path: string): string[] {
    const base = this.baseUrl.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    const primary = `${base}${p}`;

    const hasApi = /\/api$/.test(base);
    const altBase = hasApi ? base.replace(/\/api$/, '') : `${base}/api`;
    const alt = `${altBase}${p}`;

    // Dedupe + sanea trailing slashes
    const set = new Set([primary.replace(/\/+$/, ''), alt.replace(/\/+$/, '')]);
    return Array.from(set);
  }

  private getWithApiFallback<T>(path: string, headers: any, params?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    return this.http.get<T>(primary, { headers, params }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) return this.http.get<T>(alt, { headers, params });
        return this.headersService.handleError(err);
      })
    );
  }

  private postWithApiFallback<T>(path: string, body: any, headers: any, params?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    return this.http.post<T>(primary, body, { headers, params }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) return this.http.post<T>(alt, body, { headers, params });
        return this.headersService.handleError(err);
      })
    );
  }

  private putWithApiFallback<T>(path: string, body: any, headers: any, params?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    return this.http.put<T>(primary, body, { headers, params }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) return this.http.put<T>(alt, body, { headers, params });
        return this.headersService.handleError(err);
      })
    );
  }

  private deleteWithApiFallback<T>(path: string, headers: any, params?: any, body?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    return this.http.request<T>('DELETE', primary, { headers, params, body }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) {
          return this.http.request<T>('DELETE', alt, { headers, params, body });
        }
        return this.headersService.handleError(err);
      })
    );
  }

  // ───────── BOOKINGS ─────────

  listarBookings(
    filtro: BookingFiltro = {}
  ): Observable<{ total: number; page: number; pages: number; bookings: RentalBooking[]; }> {
    const params = this.toParams(filtro);
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.getWithApiFallback<{ total: number; page: number; pages: number; bookings: RentalBooking[] }>(
          `${this.BOOKING_BASE}`, headers, params
        )
      )
    );
  }

  getBookingById(id: string): Observable<RentalBooking> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.getWithApiFallback<RentalBooking>(`${this.BOOKING_BASE}/${id}`, headers)
      )
    );
  }

  getMyBookings(): Observable<RentalBooking[]> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.getWithApiFallback<RentalBooking[]>(`${this.BOOKING_BASE}/mine`, headers)
      )
    );
  }

  getBookingsByCar(carId: string, filtro: Partial<BookingFiltro> = {}): Observable<RentalBooking[]> {
    const params = this.toParams(filtro);
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.getWithApiFallback<RentalBooking[]>(`${this.BOOKING_BASE}/car/${carId}`, headers, params)
      )
    );
  }

  createBookingV2(data: CreateBookingInput): Observable<CreateBookingResponse> {
    const payload: any = { ...data };

    // Convertimos fechas a ISO (servidor espera ISO). Si tu backend maneja solo día, ajusta aquí.
    payload.fechaInicio = new Date(data.fechaInicio).toISOString();
    payload.fechaFin = new Date(data.fechaFin).toISOString();

    // Parse seguro de items si llegan como string JSON desde UI
    if (typeof payload.items === 'string') {
      try { payload.items = JSON.parse(payload.items); }
      catch { return throwError(() => new Error('Formato inválido de items (JSON)')); }
    }

    if (!payload.rentalCar || !payload.fechaInicio || !payload.fechaFin) {
      return throwError(() => new Error('Faltan campos: rentalCar, fechaInicio, fechaFin'));
    }
    if (new Date(payload.fechaFin) <= new Date(payload.fechaInicio)) {
      return throwError(() => new Error('Rango de fechas inválido: fechaFin debe ser > fechaInicio.'));
    }
    if (payload.aceptoTerminos !== true) {
      return throwError(() => new Error('Debes aceptar los términos para continuar.'));
    }

    return this.authJsonHeaders$().pipe(
      switchMap(headers =>
        this.postWithApiFallback<CreateBookingResponse>(`${this.BOOKING_BASE}`, payload, headers)
      )
    );
  }

  // ===== Acciones (únicamente endpoints soportados por el backend) =====

  /** Aceptar reserva. Permite opcionalmente enviar flags (si el backend los soporta). */
  acceptBooking(
    id: string,
    opts: { force?: boolean; ignoreTraslape?: boolean; ignoreOverlap?: boolean } = {}
  ): Observable<{ message: string; booking: RentalBooking; }> {
    const body: any = {};
    if (opts.force === true) body.force = true;
    if (opts.ignoreTraslape === true) body.ignoreTraslape = true;
    if (opts.ignoreOverlap === true) body.ignoreOverlap = true;

    return this.authJsonHeaders$().pipe(
      switchMap(headers =>
        this.postWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/accept`, body, headers
        )
      )
    );
  }

  startBooking(id: string): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap(headers =>
        this.postWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/start`, {}, headers
        )
      )
    );
  }

  finishBooking(id: string): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap(headers =>
        this.postWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/finish`, {}, headers
        )
      )
    );
  }

  cancelBooking(id: string, motivo?: string): Observable<{ message: string; booking: RentalBooking; }> {
    const body = motivo ? { motivo } : {};
    return this.authJsonHeaders$().pipe(
      switchMap(headers =>
        this.postWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/cancel`, body, headers
        )
      )
    );
  }

  // ===== Fotos / otros endpoints =====

  setCheckIn(id: string, fotos: File[]): Observable<{ message: string; booking: RentalBooking; }> {
    const fd = new FormData();
    (fotos || []).forEach((f) => fd.append('checkInFotos', f));
    return this.authMultipartHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/checkin`, fd, headers
        )
      )
    );
  }

  setCheckOut(id: string, fotos: File[]): Observable<{ message: string; booking: RentalBooking; }> {
    const fd = new FormData();
    (fotos || []).forEach((f) => fd.append('checkOutFotos', f));
    return this.authMultipartHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/checkout`, fd, headers
        )
      )
    );
  }

  updatePayment(id: string, data: {
    metodo?: string;
    montoPagado?: number;
    moneda?: string;
    referencia?: string;
    notas?: string;
    estatus?: Pago['estatus'];
    monto?: number;
  }): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/payment`, data, headers
        )
      )
    );
  }

  // ⚠️ Alineado con el tipo Deposito.estatus del modelo
  updateDeposit(id: string, data: {
    monto?: number;
    moneda?: string;
    estatus?: 'no_aplicado' | 'preautorizado' | 'cobrado' | 'liberado' | 'parcial_retenido';
    referencia?: string;
  }): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/deposit`, data, headers
        )
      )
    );
  }

  setContractUrl(id: string, url: string): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/contract`, { url }, headers
        )
      )
    );
  }

  replaceItems(id: string, items: any[]): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/items`, { items }, headers
        )
      )
    );
  }

  addLineItem(id: string, item: any): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.postWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/items`, item, headers
        )
      )
    );
  }

  removeLineItem(id: string, index: number): Observable<{ message: string; booking: RentalBooking; }> {
    // Nota: DELETE con body puede fallar en algunos proxies. Si da problemas, mover a POST /items/remove
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.deleteWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/items`, headers, undefined, { index }
        )
      )
    );
  }

  deleteBooking(id: string): Observable<{ message: string; }> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.deleteWithApiFallback<{ message: string }>(
          `${this.BOOKING_BASE}/${id}`, headers
        )
      )
    );
  }
}
