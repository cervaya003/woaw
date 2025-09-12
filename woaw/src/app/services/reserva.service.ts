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
        return h.delete('Content-Type');
      })
    );
  }

  // ───────── fallback /api (baseUrl con/sin /api) ─────────
  private buildApiCandidates(path: string): string[] {
    const base = this.baseUrl.replace(/\/+$/, '');
    const primary = `${base}${path.startsWith('/') ? '' : '/'}${path}`;

    const hasApi = /\/api$/.test(base);
    const altBase = hasApi ? base.replace(/\/api$/, '') : `${base}/api`;
    const alt = `${altBase}${path.startsWith('/') ? '' : '/'}${path}`;

    return primary === alt ? [primary] : [primary, alt];
  }

  private getWithApiFallback<T>(path: string, headers: any, params?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    return this.http.get<T>(primary, { headers, params }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) return this.http.get<T>(alt, { headers, params });
        return throwError(() => err);
      })
    );
  }

  private postWithApiFallback<T>(path: string, body: any, headers: any, params?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    return this.http.post<T>(primary, body, { headers, params }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) return this.http.post<T>(alt, body, { headers, params });
        return throwError(() => err);
      })
    );
  }

  private putWithApiFallback<T>(path: string, body: any, headers: any, params?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    return this.http.put<T>(primary, body, { headers, params }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) return this.http.put<T>(alt, body, { headers, params });
        return throwError(() => err);
      })
    );
  }

  private deleteWithApiFallback<T>(path: string, headers: any, params?: any, body?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    return this.http.request<T>('DELETE', primary, { headers, params, body }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) return this.http.request<T>('DELETE', alt, { headers, params, body });
        return throwError(() => err);
      })
    );
  }

  // ───────── BOOKINGS ─────────

  listarBookings(
    filtro: BookingFiltro = {}
  ): Observable<{ total: number; page: number; pages: number; bookings: any[]; }> {
    const params = this.toParams(filtro);
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.getWithApiFallback<{ total: number; page: number; pages: number; bookings: any[] }>(
          `${this.BOOKING_BASE}`, headers, params
        )
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  getBookingById(id: string): Observable<RentalBooking> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.getWithApiFallback<RentalBooking>(`${this.BOOKING_BASE}/${id}`, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  getMyBookings(): Observable<RentalBooking[]> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.getWithApiFallback<RentalBooking[]>(`${this.BOOKING_BASE}/mine`, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  getBookingsByCar(carId: string, filtro: Partial<BookingFiltro> = {}): Observable<RentalBooking[]> {
    const params = this.toParams(filtro);
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.getWithApiFallback<RentalBooking[]>(`${this.BOOKING_BASE}/car/${carId}`, headers, params)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  createBookingV2(data: CreateBookingInput): Observable<CreateBookingResponse> {
    const payload: any = { ...data };
    payload.fechaInicio = new Date(data.fechaInicio).toISOString();
    payload.fechaFin = new Date(data.fechaFin).toISOString();

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
      ),
      catchError(err => this.headersService.handleError(err))
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
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  startBooking(id: string): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap(headers =>
        this.postWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/start`, {}, headers
        )
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  finishBooking(id: string): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap(headers =>
        this.postWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/finish`, {}, headers
        )
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  cancelBooking(id: string, motivo?: string): Observable<{ message: string; booking: RentalBooking; }> {
    const body = motivo ? { motivo } : {};
    return this.authJsonHeaders$().pipe(
      switchMap(headers =>
        this.postWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/cancel`, body, headers
        )
      ),
      catchError((error) => this.headersService.handleError(error))
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
      ),
      catchError((error) => this.headersService.handleError(error))
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
      ),
      catchError((error) => this.headersService.handleError(error))
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
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  updateDeposit(id: string, data: {
    monto?: number;
    moneda?: string;
    estatus?: 'retenido' | 'devuelto' | 'parcial';
    referencia?: string;
  }): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/deposit`, data, headers
        )
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  setContractUrl(id: string, url: string): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/contract`, { url }, headers
        )
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  replaceItems(id: string, items: any[]): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/items`, { items }, headers
        )
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  addLineItem(id: string, item: any): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.postWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/items`, item, headers
        )
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  removeLineItem(id: string, index: number): Observable<{ message: string; booking: RentalBooking; }> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.deleteWithApiFallback<{ message: string; booking: RentalBooking }>(
          `${this.BOOKING_BASE}/${id}/items`, headers, undefined, { index }
        )
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  deleteBooking(id: string): Observable<{ message: string; }> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.deleteWithApiFallback<{ message: string }>(
          `${this.BOOKING_BASE}/${id}`, headers
        )
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }
}
