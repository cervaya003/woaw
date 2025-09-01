import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class RentaService {
  private readonly _baseUrl = this.normalizeBaseUrl(environment.api_key);
  public get baseUrl(): string {
    return this._baseUrl;
  }

  constructor(
    private http: HttpClient,
    private headersService: HeadersService
  ) { }

  // helper para normalizar
  private normalizeBaseUrl(url: string): string {
    return (url || '').replace(/\/+$/, '');
  }

  // helper para armar HttpParams desde objeto
  private toParams(obj: Record<string, any>): HttpParams {
    let params = new HttpParams();
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
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
   * Opción A (recomendada): manda `precio` como objeto { porDia, moneda }.
   * Opción B (legacy soportada): manda `precioPorDia` + `moneda`.
   */
  addRentalCar(payload: {
    // campos simples
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
    // money
    precio?: { porDia: number; moneda?: string }; // << sin semana/mes
    precioPorDia?: number; // legacy opcional (si no mandas "precio")
    moneda?: string;       // legacy opcional (si no mandas "precio")
    // enums/políticas
    politicaCombustible?: 'lleno-lleno' | 'como-esta';
    politicaLimpieza?: 'normal' | 'estricta';
    // objetos que el backend espera como JSON (parseMaybeJSON)
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
    // archivos
    imagenPrincipal: File;
    imagenes?: File[];
    tarjetaCirculacion?: File;
  }): Observable<any> {
    const fd = new FormData();

    // Campos simples
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

    // Objetos que el backend parsea como JSON:
    if (payload.precio) fd.append('precio', JSON.stringify(payload.precio));
    if (payload.requisitosConductor) fd.append('requisitosConductor', JSON.stringify(payload.requisitosConductor));
    if (payload.ubicacion) fd.append('ubicacion', JSON.stringify(payload.ubicacion));
    if (payload.entrega) fd.append('entrega', JSON.stringify(payload.entrega));
    if (payload.ventanasDisponibles) fd.append('ventanasDisponibles', JSON.stringify(payload.ventanasDisponibles));
    if (payload.excepcionesNoDisponibles) fd.append('excepcionesNoDisponibles', JSON.stringify(payload.excepcionesNoDisponibles));
    if (payload.polizaPlataforma) fd.append('polizaPlataforma', JSON.stringify(payload.polizaPlataforma));

    // Archivos
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
      // simples
      marca?: string; modelo?: string; anio?: number;
      version?: string; tipoVehiculo?: string; transmision?: string;
      combustible?: string; cilindros?: string; color?: string;
      pasajeros?: number; motor?: string; potencia?: string; rines?: string;
      kilometrajeActual?: number; verificadoPlataforma?: boolean;
      politicaCombustible?: 'lleno-lleno' | 'como-esta';
      politicaLimpieza?: 'normal' | 'estricta';
      estadoRenta?: 'disponible' | 'rentado' | 'mantenimiento' | 'inactivo';

      // money
      precio?: { porDia: number; moneda?: string };

      // JSON
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

      lote?: string | null;            // null => limpiar lote
      imagenesExistentes?: string[];   // URLs a conservar
      imagenPrincipal?: string;        // URL si NO subes archivo
      tarjetaCirculacionURL?: string;  // URL si NO subes archivo
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

        if (k === 'lote' && v === null) { fd.append('lote', ''); return; } // backend => null

        // si mandas URL de principal/TC y también viene archivo, ignora la URL
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
      if (body.lote === null) body.lote = ''; // limpiar lote
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

  /** (Opcional) Cambiar estadoRenta si tienes endpoint dedicado */
  updateEstadoRenta(id: string, estado: 'disponible' | 'rentado' | 'mantenimiento' | 'inactivo'): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.put(`${this.baseUrl}/rentalcars/${id}/estado`, { estadoRenta: estado }, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // ───────────────────────────────────────────────
  // BOOKINGS (reservas)
  // ───────────────────────────────────────────────

  /** Listado de reservas (admin/propietario según backend) con filtros y paginación */
  listarBookings(filtro: BookingFiltro = {}): Observable<{
    total: number; page: number; pages: number; bookings: any[];
  }> {
    const params = this.toParams(filtro);
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.get<{
          total: number; page: number; pages: number; bookings: any[];
        }>(`${this.baseUrl}/bookings`, { headers, params })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Detalle de una reserva */
  getBookingById(id: string): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.get(`${this.baseUrl}/bookings/${id}`, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Mis reservas (como usuario que renta) */
  getMyBookings(): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.get(`${this.baseUrl}/bookings/mine`, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Reservas por coche */
  getBookingsByCar(carId: string, filtro: Partial<BookingFiltro> = {}): Observable<any> {
    const params = this.toParams(filtro);
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.get(`${this.baseUrl}/bookings/car/${carId}`, { headers, params })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Crear reserva */
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
        this.http.post(`${this.baseUrl}/bookings`, data, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Aceptar reserva */
  acceptBooking(id: string): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.post(`${this.baseUrl}/bookings/${id}/accept`, {}, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Iniciar renta (entrega del vehículo) */
  startBooking(id: string): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.post(`${this.baseUrl}/bookings/${id}/start`, {}, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Finalizar renta (devolución) */
  finishBooking(id: string): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.post(`${this.baseUrl}/bookings/${id}/finish`, {}, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Cancelar reserva */
  cancelBooking(id: string, motivo?: string): Observable<any> {
    const body = motivo ? { motivo } : {};
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.post(`${this.baseUrl}/bookings/${id}/cancel`, body, { headers })
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
        this.http.put(`${this.baseUrl}/bookings/${id}/checkin`, fd, { headers })
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
        this.http.put(`${this.baseUrl}/bookings/${id}/checkout`, fd, { headers })
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
        this.http.put(`${this.baseUrl}/bookings/${id}/payment`, data, { headers })
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
        this.http.put(`${this.baseUrl}/bookings/${id}/deposit`, data, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Guardar URL de contrato firmado */
  setContractUrl(id: string, url: string): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.put(`${this.baseUrl}/bookings/${id}/contract`, { url }, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Reemplazar items (línea de cargos/accesorios) */
  replaceItems(id: string, items: any[]): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.put(`${this.baseUrl}/bookings/${id}/items`, { items }, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Agregar un item */
  addLineItem(id: string, item: any): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.post(`${this.baseUrl}/bookings/${id}/items`, item, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Remover item por índice */
  removeLineItem(id: string, index: number): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.request('DELETE', `${this.baseUrl}/bookings/${id}/items`, {
          headers,
          body: { index },
        })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** (Opcional) Borrar reserva si lo manejas en backend */
  deleteBooking(id: string): Observable<any> {
    return this.authJsonHeaders$().pipe(
      switchMap((headers) =>
        this.http.delete(`${this.baseUrl}/bookings/${id}`, { headers })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }


}
