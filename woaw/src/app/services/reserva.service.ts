import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { HeadersService } from './headers.service';
import { GeneralService } from './general.service';

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
  usuario: any;
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
  items?: LineItem[] | string;
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
  private readonly BOOKING_BASE = '/booking/bookings';

  constructor(
    private http: HttpClient,
    private headersService: HeadersService,
    private general: GeneralService
  ) { }

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
        return h.delete('Content-Type');
      })
    );
  }

  private buildApiCandidates(path: string): string[] {
    const base = this.baseUrl.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    const primary = `${base}${p}`;
    const hasApi = /\/api$/.test(base);
    const altBase = hasApi ? base.replace(/\/api$/, '') : `${base}/api`;
    const alt = `${altBase}${p}`;
    const set = new Set([primary.replace(/\/+$/, ''), alt.replace(/\/+$/, '')]);
    return Array.from(set);
  }

  private withNoCache(h: HttpHeaders): HttpHeaders {
    return h
      .set('Cache-Control', 'no-cache')
      .set('Pragma', 'no-cache')
      .set('If-Modified-Since', '0');
  }

  private withNoCacheHeaders(headers: any): any {
    if (headers instanceof HttpHeaders) {
      return this.withNoCache(headers);
    }
    return {
      ...headers,
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'If-Modified-Since': '0',
    };
  }

  private addCacheBuster(p?: HttpParams): HttpParams {
    const ts = Date.now().toString();
    return (p ?? new HttpParams()).set('_ts', ts);
  }

  private formatHttpErrorMessage(err: any): string {
    const fallback = 'Ocurrió un error al procesar la solicitud.';
    if (!err) return fallback;

    const parts: string[] = [];
    const body = err.error;

    if (body) {
      if (typeof body === 'string') {
        parts.push(body);
      } else {
        if (typeof body.message === 'string') parts.push(body.message);               // título típico
        if (typeof body.error === 'string') parts.push(body.error);                   // detalle típico
        else if (body.error?.message) parts.push(String(body.error.message));

        if (Array.isArray(body.errors) && body.errors.length > 0) {
          parts.push(
            ...body.errors
              .map((e: any) => e?.msg || e?.message || e)
              .filter(Boolean)
              .map(String)
          );
        }
      }
    }

    if (parts.length === 0 && err.message) parts.push(String(err.message));

    const clean = Array.from(new Set(parts.map(s => s.trim()).filter(Boolean)));
    return clean.length ? clean.join('\n') : fallback;
  }

  private handleHttpErrorWithContext(_op: 'GET' | 'POST' | 'PUT' | 'DELETE', _path: string) {
    return (err: any) => {
      const body = err?.error;
      const title =
        (typeof body?.message === 'string' && body.message.trim()) ||
        (typeof err?.message === 'string' && err.message.trim()) ||
        'No se pudo completar la acción';

      let detail = '';
      if (typeof body?.error === 'string' && body.error.trim()) {
        detail = body.error.trim();
      } else if (body?.error?.message) {
        detail = String(body.error.message);
      } else if (Array.isArray(body?.errors) && body.errors.length) {
        detail = body.errors
          .map((e: any) => e?.msg || e?.message || String(e))
          .filter(Boolean)
          .join('\n');
      }

      if (!detail) detail = this.formatHttpErrorMessage(err);

      this.general.alert(title, detail, 'danger');
      return throwError(() => err);
    };
  }

  private getWithApiFallback<T>(path: string, headers: any, params?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    const h = this.withNoCacheHeaders(headers);
    const handle = this.handleHttpErrorWithContext('GET', path);

    return this.http.get<T>(primary, { headers: h, params }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) {
          return this.http.get<T>(alt, { headers: h, params }).pipe(
            catchError(this.handleHttpErrorWithContext('GET', path))
          );
        }
        return handle(err);
      })
    );
  }

  private postWithApiFallback<T>(path: string, body: any, headers: any, params?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    const handle = this.handleHttpErrorWithContext('POST', path);

    return this.http.post<T>(primary, body, { headers, params }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) {
          return this.http.post<T>(alt, body, { headers, params }).pipe(
            catchError(this.handleHttpErrorWithContext('POST', path))
          );
        }
        return handle(err);
      })
    );
  }

  private putWithApiFallback<T>(path: string, body: any, headers: any, params?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    const handle = this.handleHttpErrorWithContext('PUT', path);

    return this.http.put<T>(primary, body, { headers, params }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) {
          return this.http.put<T>(alt, body, { headers, params }).pipe(
            catchError(this.handleHttpErrorWithContext('PUT', path))
          );
        }
        return handle(err);
      })
    );
  }

  private deleteWithApiFallback<T>(path: string, headers: any, params?: any, body?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    const handle = this.handleHttpErrorWithContext('DELETE', path);

    return this.http.request<T>('DELETE', primary, { headers, params, body }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) {
          return this.http.request<T>('DELETE', alt, { headers, params, body }).pipe(
            catchError(this.handleHttpErrorWithContext('DELETE', path))
          );
        }
        return handle(err);
      })
    );
  }

  listarBookings(
    filtro: BookingFiltro = {}
  ): Observable<{ total: number; page: number; pages: number; bookings: RentalBooking[]; }> {
    const params = this.addCacheBuster(this.toParams(filtro));
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
        this.getWithApiFallback<RentalBooking>(
          `${this.BOOKING_BASE}/${id}`, headers, this.addCacheBuster()
        )
      )
    );
  }

  getMyBookings(): Observable<RentalBooking[]> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.getWithApiFallback<RentalBooking[]>(
          `${this.BOOKING_BASE}/mine`, headers, this.addCacheBuster()
        )
      )
    );
  }

  getBookingsByCar(carId: string, filtro: Partial<BookingFiltro> = {}): Observable<RentalBooking[]> {
    const params = this.addCacheBuster(this.toParams(filtro));
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.getWithApiFallback<RentalBooking[]>(`${this.BOOKING_BASE}/car/${carId}`, headers, params)
      )
    );
  }

  createBookingV2(data: CreateBookingInput): Observable<CreateBookingResponse> {
    const payload: any = { ...data };

    payload.fechaInicio = new Date(data.fechaInicio).toISOString();
    payload.fechaFin = new Date(data.fechaFin).toISOString();

    if (typeof payload.items === 'string') {
      try { payload.items = JSON.parse(payload.items); }
      catch {
        this.general.alert('Datos inválidos', 'Formato inválido de items (JSON).', 'danger');
        return throwError(() => new Error('Formato inválido de items (JSON)'));
      }
    }

    if (!payload.rentalCar || !payload.fechaInicio || !payload.fechaFin) {
      this.general.alert('Campos faltantes', 'Faltan campos: rentalCar, fechaInicio, fechaFin', 'danger');
      return throwError(() => new Error('Faltan campos: rentalCar, fechaInicio, fechaFin'));
    }
    if (new Date(payload.fechaFin) <= new Date(payload.fechaInicio)) {
      this.general.alert('Rango inválido', 'fechaFin debe ser mayor a fechaInicio.', 'danger');
      return throwError(() => new Error('Rango de fechas inválido: fechaFin debe ser > fechaInicio.'));
    }
    if (payload.aceptoTerminos !== true) {
      this.general.alert('Términos', 'Debes aceptar los términos para continuar.', 'danger');
      return throwError(() => new Error('Debes aceptar los términos para continuar.'));
    }

    return this.authJsonHeaders$().pipe(
      switchMap(headers =>
        this.postWithApiFallback<CreateBookingResponse>(`${this.BOOKING_BASE}`, payload, headers)
      )
    );
  }

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

  setCheckIn(
    id: string,
    fotos: File[] = [],
    data?: { fecha?: string; combustible?: number; notas?: string; existentes?: string[] }
  ): Observable<{ message: string; booking: RentalBooking; }> {
    const fd = new FormData();
    (fotos || []).forEach((f) => fd.append('checkInFotos', f));
    if (data?.fecha) fd.append('fecha', data.fecha);
    if (data?.combustible != null) fd.append('combustible', String(data.combustible));
    if (data?.notas != null) fd.append('notas', data.notas);
    if (data?.existentes) fd.append('checkInFotosExistentes', JSON.stringify(data.existentes));

    return this.authMultipartHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/checkin`, fd, headers
        )
      )
    );
  }

  setCheckOut(
    id: string,
    fotos: File[] = [],
    data?: { fecha?: string; combustible?: number; notas?: string }
  ): Observable<{ message: string; booking: RentalBooking; }> {
    const fd = new FormData();
    (fotos || []).forEach((f) => fd.append('checkOutFotos', f));
    if (data?.fecha) fd.append('fecha', data.fecha);
    if (data?.combustible != null) fd.append('combustible', String(data.combustible));
    if (data?.notas != null) fd.append('notas', data.notas);

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

  updateBookingPartial(id: string, data: Partial<RentalBooking>) {
    return this.authJsonHeaders$().pipe(
      switchMap(headers =>
        this.putWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}`, data, headers
        )
      )
    );
  }

  removeLineItem(id: string, index: number): Observable<{ message: string; booking: RentalBooking; }> {
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

  saveCheckInData(id: string, data: { fecha?: string; combustible?: number; notas?: string }) {
    return this.authJsonHeaders$().pipe(
      switchMap(headers =>
        this.putWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/checkin`,
          data,
          headers
        )
      )
    );
  }
}
