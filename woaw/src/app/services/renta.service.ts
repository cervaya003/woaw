import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { HeadersService } from './headers.service';

// ───────────────────────────────────────────────
// TIPOS (opcionales, pero recomendados)
// ───────────────────────────────────────────────
export interface RentaFiltro {
  marca?: string;
  modelo?: string;
  anio?: number;
  estado?: string;
  ciudad?: string;
  tipoVehiculo?: string;
  precioMin?: number;
  precioMax?: number;
  page?: number;
  limit?: number;
  sort?: string;
  [key: string]: any;
}

export interface BookingFiltro {
  estatus?: 'pendiente' | 'aceptada' | 'en_curso' | 'finalizada' | 'cancelada';
  usuario?: string;      // ObjectId
  rentalCar?: string;    // ObjectId
  desde?: string;        // ISO date
  hasta?: string;        // ISO date
  page?: number;
  limit?: number;
  sort?: string;
  [key: string]: any;
}

// === Booking domain (alineado a tu backend) ===
export type BookingStatus = 'pendiente' | 'aceptada' | 'en_curso' | 'finalizada' | 'cancelada';

export interface LineItem {
  concepto: string;
  tipo?: string;
  cantidad: number;        // >= 1
  precioUnitario: number;  // >= 0
  subtotal: number;        // cantidad * precioUnitario
}

export interface Pago {
  estatus: 'no_pagado' | 'preautorizado' | 'pagado' | 'reembolsado';
  metodo?: string;
  referencia?: string;
  monto?: number;
  moneda?: string; // MXN por defecto
}

export interface Deposito {
  estatus: 'no_aplicado' | 'preautorizado' | 'cobrado' | 'liberado' | 'parcial_retenido';
  referencia?: string;
  monto?: number;
}

export interface CheckInfo {
  fecha?: string;        // ISO
  combustible?: number;  // 0..100
  fotos?: string[];      // URLs
  notas?: string;
}

export interface RentalBooking {
  _id: string;
  codigo?: string;
  rentalCar: string;              // ObjectId
  usuario: string;                // ObjectId
  fechaInicio: string;            // ISO
  fechaFin: string;               // ISO
  estatus: BookingStatus;
  moneda: string;                 // default MXN
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
  fechaInicio: string | Date;    // se normaliza a ISO
  fechaFin: string | Date;       // se normaliza a ISO
  items?: LineItem[] | string;   // el backend hace parseMaybeJSON
  total?: number;                // opcional (el backend lo calcula si no va)
  moneda?: string;               // default "MXN"
  notasCliente?: string;
  politicaCancelacion?: string;
  aceptoTerminos: boolean;       // requerido por el backend
}

export interface CreateBookingResponse {
  message: string;               // "Reserva creada"
  booking: RentalBooking;
}

@Injectable({ providedIn: 'root' })
export class RentaService {
  private readonly _baseUrl = this.normalizeBaseUrl(environment.api_key);
  public get baseUrl(): string { return this._baseUrl; }

  // Prefijo correcto que te pasaron
  private readonly BOOKING_BASE = '/booking/bookings';

  constructor(
    private http: HttpClient,
    private headersService: HeadersService
  ) { }

  // helper para normalizar
  private normalizeBaseUrl(url: string): string {
    return (url || '').replace(/\/+$/, '');
  }

  // helper para armar HttpParams desde objeto (soporta arrays)
  private toParams(obj: Record<string, any>): HttpParams {
    let params = new HttpParams();
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      if (Array.isArray(v)) {
        v.forEach(item => { params = params.append(k, String(item)); });
      } else {
        params = params.set(k, String(v));
      }
    });
    return params;
  }

  // helper: headers con token (JSON)
  private authJsonHeaders$() {
    return from(this.headersService.obtenerToken()).pipe(
      map((token) => this.headersService.getJsonHeaders(token))
    );
  }

  // helper: headers con token (multipart). OJO: no setear Content-Type manualmente
  private authMultipartHeaders$() {
    return from(this.headersService.obtenerToken()).pipe(
      map((token) => {
        const h = this.headersService.getJsonHeaders(token) as HttpHeaders;
        // remover content-type si tu headersService lo agrega por defecto
        return h.delete('Content-Type');
      })
    );
  }

  // === Helpers Booking añadidos ===
  /** Normaliza a ISO string (UTC) */
  private toISO(d: string | Date): string {
    return new Date(d).toISOString();
  }

  /** Días enteros entre 2 fechas (mínimo 1) */
  private diasEntre(inicioISO: string, finISO: string): number {
    const ms = new Date(finISO).getTime() - new Date(inicioISO).getTime();
    const d = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return Math.max(1, d);
  }

  /** Cotiza total localmente: por día + extras */
  public cotizarTotal(porDia: number, fechaInicio: string | Date, fechaFin: string | Date, items: LineItem[] = []): number {
    const inicio = this.toISO(fechaInicio);
    const fin = this.toISO(fechaFin);
    const ndays = this.diasEntre(inicio, fin);
    const base = (porDia || 0) * ndays;  // ← aquí estaba el typo
    const extras = items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
    return Math.round((base + extras) * 100) / 100;
  }

  // ───────────────────────────────────────────────
  // Fallback de rutas (/api vs sin /api) SOLO para bookings
  // ───────────────────────────────────────────────

  /** Genera par (primaria, alternativa) alternando la presencia de `/api` al final del baseUrl */
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
        if (err?.status === 404 && alt) {
          return this.http.get<T>(alt, { headers, params });
        }
        return throwError(() => err);
      })
    );
  }

  private postWithApiFallback<T>(path: string, body: any, headers: any, params?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    return this.http.post<T>(primary, body, { headers, params }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) {
          return this.http.post<T>(alt, body, { headers, params });
        }
        return throwError(() => err);
      })
    );
  }

  private putWithApiFallback<T>(path: string, body: any, headers: any, params?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    return this.http.put<T>(primary, body, { headers, params }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) {
          return this.http.put<T>(alt, body, { headers, params });
        }
        return throwError(() => err);
      })
    );
  }

  private patchWithApiFallback<T>(path: string, body: any, headers: any, params?: any) {
    const [primary, alt] = this.buildApiCandidates(path);
    return this.http.patch<T>(primary, body, { headers, params }).pipe(
      catchError((err) => {
        if (err?.status === 404 && alt) {
          return this.http.patch<T>(alt, body, { headers, params });
        }
        return throwError(() => err);
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
        return throwError(() => err);
      })
    );
  }

  // ───────────────────────────────────────────────
  // RENTALCARS (público / propietario)
  // ───────────────────────────────────────────────

  /** Traer todos los coches (endpoint público, sin token) */
  listarCoches(filtro: RentaFiltro = {}): Observable<any> {
    const params = this.toParams(filtro);
    return this.http.get(`${this.baseUrl}/rentalcars`, { params });
  }

  /** Traer mis coches de renta (con token) */
  misCoches(): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.get(`${this.baseUrl}/rentalcars/vehiculos/user`, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Traer detalle por ID (público) */
  cochePorId(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/rentalcars/${id}`);
  }

  /**
   * Registrar un vehículo de renta (con imágenes)
   */
  addRentalCar(payload: {
    marca: string;
    modelo: string;
    anio: number;
    version?: string;
    tipoVehiculo?: string;
    transmision?: string;
    combustible?: string;
    cilindros?: string;
    color?: string;
    pasajeros?: number;
    motor?: string;
    potencia?: string;
    rines?: string;
    kilometrajeActual?: number;
    verificadoPlataforma?: boolean;
    precio?: { porDia: number; moneda?: string };
    precioPorDia?: number;
    moneda?: string;
    politicaCombustible?: 'lleno-lleno' | 'como-esta';
    politicaLimpieza?: 'normal' | 'estricta';
    requisitosConductor?: any;
    ubicacion?: any;
    entrega?: any;
    ventanasDisponibles?: any[];
    excepcionesNoDisponibles?: any[];
    polizaPlataforma: {
      numero: string;
      aseguradora: 'Uber' | 'DiDi' | 'inDrive' | 'Cabify' | 'Otro';
      cobertura: 'RC' | 'Amplia' | 'Amplia Plus';
      vigenciaDesde: string; // ISO
      vigenciaHasta: string; // ISO
      urlPoliza?: string;
    };
    lote?: string | null;
    imagenPrincipal: File;
    imagenes?: File[];
    tarjetaCirculacion?: File;
  }): Observable<any> {
    const fd = new FormData();

    [
      'marca', 'modelo', 'version', 'tipoVehiculo', 'transmision', 'combustible', 'cilindros', 'color',
      'motor', 'potencia', 'rines', 'moneda', 'lote'
    ].forEach((k) => (payload as any)[k] != null && fd.append(k, String((payload as any)[k])));

    ['anio', 'pasajeros', 'kilometrajeActual', 'precioPorDia']
      .forEach((k) => (payload as any)[k] != null && fd.append(k, String((payload as any)[k])));

    if (payload.verificadoPlataforma != null) {
      fd.append('verificadoPlataforma', String(payload.verificadoPlataforma));
    }
    if (payload.politicaCombustible) fd.append('politicaCombustible', payload.politicaCombustible);
    if (payload.politicaLimpieza) fd.append('politicaLimpieza', payload.politicaLimpieza);

    if (payload.precio) fd.append('precio', JSON.stringify(payload.precio));
    if (payload.requisitosConductor) fd.append('requisitosConductor', JSON.stringify(payload.requisitosConductor));
    if (payload.ubicacion) fd.append('ubicacion', JSON.stringify(payload.ubicacion));
    if (payload.entrega) fd.append('entrega', JSON.stringify(payload.entrega));
    if (payload.ventanasDisponibles) fd.append('ventanasDisponibles', JSON.stringify(payload.ventanasDisponibles));
    if (payload.excepcionesNoDisponibles) fd.append('excepcionesNoDisponibles', JSON.stringify(payload.excepcionesNoDisponibles));
    if (payload.polizaPlataforma) fd.append('polizaPlataforma', JSON.stringify(payload.polizaPlataforma));

    if (payload.imagenPrincipal) fd.append('imagenPrincipal', payload.imagenPrincipal);
    (payload.imagenes || []).forEach((f) => fd.append('imagenes', f));
    if (payload.tarjetaCirculacion) fd.append('tarjetaCirculacion', payload.tarjetaCirculacion);

    return this.authMultipartHeaders$().pipe(
      switchMap((headers) =>
        this.http.post(`${this.baseUrl}/rentalcars`, fd, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Editar vehículo de renta (PUT /rentalcars/:id) */
  updateRentalCar(
    id: string,
    data: {
      marca?: string; modelo?: string; anio?: number;
      version?: string; tipoVehiculo?: string; transmision?: string;
      combustible?: string; cilindros?: string; color?: string;
      pasajeros?: number; motor?: string; potencia?: string; rines?: string;
      kilometrajeActual?: number; verificadoPlataforma?: boolean;
      politicaCombustible?: 'lleno-lleno' | 'como-esta';
      politicaLimpieza?: 'normal' | 'estricta';
      estadoRenta?: 'disponible' | 'rentado' | 'mantenimiento' | 'inactivo';
      precio?: { porDia: number; moneda?: string };
      requisitosConductor?: any;
      ubicacion?: any;
      entrega?: any;
      ventanasDisponibles?: any[];
      excepcionesNoDisponibles?: any[];
      polizaPlataforma?: {
        numero: string;
        aseguradora: 'Uber' | 'DiDi' | 'inDrive' | 'Cabify' | 'Otro';
        cobertura: 'RC' | 'Amplia' | 'Amplia Plus';
        vigenciaDesde: string; vigenciaHasta: string; urlPoliza?: string;
      };
      lote?: string | null;
      imagenesExistentes?: string[];
      imagenPrincipal?: string;
      tarjetaCirculacionURL?: string;
    },
    files?: { imagenPrincipal?: File; imagenes?: File[]; tarjetaCirculacion?: File }
  ) {
    const hasFiles = !!(files?.imagenPrincipal || files?.imagenes?.length || files?.tarjetaCirculacion);

    if (hasFiles) {
      const fd = new FormData();
      const needsJson = [
        'precio', 'requisitosConductor', 'ubicacion', 'entrega',
        'ventanasDisponibles', 'excepcionesNoDisponibles',
        'polizaPlataforma', 'imagenesExistentes'
      ];

      Object.entries(data || {}).forEach(([k, v]) => {
        if (v === undefined) return;

        if (k === 'lote' && v === null) { fd.append('lote', ''); return; }

        if (k === 'imagenPrincipal' && files?.imagenPrincipal) return;
        if (k === 'tarjetaCirculacionURL' && files?.tarjetaCirculacion) return;

        if (needsJson.includes(k)) fd.append(k, JSON.stringify(v));
        else fd.append(k, String(v));
      });

      if (files?.imagenPrincipal) fd.append('imagenPrincipal', files.imagenPrincipal);
      (files?.imagenes || []).forEach(f => fd.append('imagenes', f));
      if (files?.tarjetaCirculacion) fd.append('tarjetaCirculacion', files.tarjetaCirculacion);

      return this.authMultipartHeaders$().pipe(
        switchMap(headers => this.http.put(`${this.baseUrl}/rentalcars/${id}`, fd, { headers })),
        catchError(err => this.headersService.handleError(err))
      );
    } else {
      const body: any = { ...(data || {}) };
      if (body.lote === null) body.lote = '';
      return this.authJsonHeaders$().pipe(
        switchMap(headers => this.http.put(`${this.baseUrl}/rentalcars/${id}`, body, { headers })),
        catchError(err => this.headersService.handleError(err))
      );
    }
  }

  /** Eliminar un coche de renta */
  deleteRentalCar(id: string): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.delete(`${this.baseUrl}/rentalcars/${id}`, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** (Opcional legacy) Cambiar estadoRenta por PUT /rentalcars/:id/estado */
  updateEstadoRenta(id: string, estado: 'disponible' | 'rentado' | 'mantenimiento' | 'inactivo'): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.put(`${this.baseUrl}/rentalcars/${id}/estado`, { estadoRenta: estado }, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  toggleEstadoRenta(
    id: string,
    action: 'disponible' | 'rentado' | 'mantenimiento' | 'inactivo'
  ): Observable<any> {
    const params = new HttpParams().set('action', action);
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.patch(`${this.baseUrl}/rentalcars/${id}/toggle-estado`, {}, { headers, params })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /**
   * PUT /rentalcars/:id/disponibilidad
   */
  setDisponibilidadCar(
    id: string,
    ventanas: Array<{ inicio: string | Date; fin: string | Date; nota?: string }> = [],
    excepciones: Array<{ inicio: string | Date; fin: string | Date; motivo?: string }> = []
  ): Observable<any> {
    const normVentanas = (ventanas || []).map(v => ({
      ...v, inicio: new Date(v.inicio).toISOString(), fin: new Date(v.fin).toISOString()
    }));
    const normExcepciones = (excepciones || []).map(e => ({
      ...e, inicio: new Date(e.inicio).toISOString(), fin: new Date(e.fin).toISOString()
    }));

    const body = {
      ventanasDisponibles: JSON.stringify(normVentanas),
      excepcionesNoDisponibles: JSON.stringify(normExcepciones),
    };

    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.put(`${this.baseUrl}/rentalcars/${id}/disponibilidad`, body, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // ───────────────────────────────────────────────
  // BOOKINGS (reservas) — usando /booking/bookings con fallback /api
  // ───────────────────────────────────────────────

  /** Listado de reservas */
  listarBookings(filtro: BookingFiltro = {}): Observable<{ total: number; page: number; pages: number; bookings: any[]; }> {
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

  /** Detalle de una reserva */
  getBookingById(id: string): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.getWithApiFallback(`${this.BOOKING_BASE}/${id}`, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Mis reservas (como usuario que renta) */
  getMyBookings(): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.getWithApiFallback(`${this.BOOKING_BASE}/mine`, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Reservas por coche */
  getBookingsByCar(carId: string, filtro: Partial<BookingFiltro> = {}): Observable<any> {
    const params = this.toParams(filtro);
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.getWithApiFallback(`${this.BOOKING_BASE}/car/${carId}`, headers, params)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Crear reserva (legacy) */
  createBooking(data: {
    rentalCar: string;
    fechaInicio: string;  // ISO
    fechaFin: string;     // ISO
    lugarEntrega?: string;
    notas?: string;
    extras?: any[];
  }): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.postWithApiFallback(`${this.BOOKING_BASE}`, data, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Crear reserva (nuevo) */
  createBookingV2(data: CreateBookingInput): Observable<CreateBookingResponse> {
    const payload: any = { ...data };
    payload.fechaInicio = this.toISO(data.fechaInicio);
    payload.fechaFin = this.toISO(data.fechaFin);

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

  /** Aceptar reserva */
  acceptBooking(id: string): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.postWithApiFallback(`${this.BOOKING_BASE}/${id}/accept`, {}, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Iniciar renta (entrega del vehículo) */
  startBooking(id: string): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.postWithApiFallback(`${this.BOOKING_BASE}/${id}/start`, {}, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Finalizar renta (devolución) */
  finishBooking(id: string): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.postWithApiFallback(`${this.BOOKING_BASE}/${id}/finish`, {}, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Cancelar reserva */
  cancelBooking(id: string, motivo?: string): Observable<any> {
    const body = motivo ? { motivo } : {};
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.postWithApiFallback(`${this.BOOKING_BASE}/${id}/cancel`, body, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Check-in (subir fotos de entrega) */
  setCheckIn(id: string, fotos: File[]): Observable<any> {
    const fd = new FormData();
    (fotos || []).forEach((f) => fd.append('checkInFotos', f));
    return this.authMultipartHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback(`${this.BOOKING_BASE}/${id}/checkin`, fd, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Check-out (subir fotos de devolución) */
  setCheckOut(id: string, fotos: File[]): Observable<any> {
    const fd = new FormData();
    (fotos || []).forEach((f) => fd.append('checkOutFotos', f));
    return this.authMultipartHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback(`${this.BOOKING_BASE}/${id}/checkout`, fd, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Actualizar pago (saldo, método, etc.) */
  updatePayment(id: string, data: {
    metodo?: string;
    montoPagado?: number;
    moneda?: string;
    referencia?: string;
    notas?: string;
  }): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback(`${this.BOOKING_BASE}/${id}/payment`, data, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Actualizar depósito (garantía) */
  updateDeposit(id: string, data: {
    monto?: number;
    moneda?: string;
    estatus?: 'retenido' | 'devuelto' | 'parcial';
    referencia?: string;
  }): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback(`${this.BOOKING_BASE}/${id}/deposit`, data, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Guardar URL de contrato firmado */
  setContractUrl(id: string, url: string): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback(`${this.BOOKING_BASE}/${id}/contract`, { url }, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Reemplazar items (línea de cargos/accesorios) */
  replaceItems(id: string, items: any[]): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.putWithApiFallback(`${this.BOOKING_BASE}/${id}/items`, { items }, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Agregar un item */
  addLineItem(id: string, item: any): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.postWithApiFallback(`${this.BOOKING_BASE}/${id}/items`, item, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Remover item por índice */
  removeLineItem(id: string, index: number): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.deleteWithApiFallback(`${this.BOOKING_BASE}/${id}/items`, headers, undefined, { index })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** (Opcional) Borrar reserva si lo manejas en backend */
  deleteBooking(id: string): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.deleteWithApiFallback(`${this.BOOKING_BASE}/${id}`, headers)
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }
}
