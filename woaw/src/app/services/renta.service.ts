import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from, EMPTY, concat } from 'rxjs';
import { switchMap, catchError, map, tap, take, throwIfEmpty } from 'rxjs/operators';
import { HeadersService } from './headers.service';

export interface RentaFiltro {
  // Filtros compatibles con el backend nuevo:
  estadoRenta?: 'disponible' | 'rentado' | 'inactivo';
  ciudad?: string;
  estado?: string;
  marca?: string;
  modelo?: string;
  minPasajeros?: number;
  maxPrecio?: number;
  // Compatibilidad UI previa:
  precioMin?: number; // (IGNORADO por el backend)
  precioMax?: number; // se mapea a maxPrecio
  // rango de fechas (ambos obligatorios si se usan)
  fechaInicio?: string; // YYYY-MM-DD o ISO
  fechaFin?: string;    // YYYY-MM-DD o ISO
  // extras de UI:
  page?: number;
  limit?: number;
  sort?: string;
  [key: string]: any;
}

export interface ListarCochesResp {
  contador: number;
  rentals: any[];
}

@Injectable({ providedIn: 'root' })
export class RentaService {
  private readonly _baseUrl = this.normalizeBaseUrl(environment.api_key);
  public get baseUrl(): string { return this._baseUrl; }

  private readonly api = `${this._baseUrl}/rentalcars`;

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
      if (Array.isArray(v)) {
        v.forEach(item => { params = params.append(k, String(item)); });
      } else {
        params = params.set(k, String(v));
      }
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

  // ───────── helpers de rutas tolerantes ─────────

  // Genera variantes: con/sin /api y rentalcars vs rental-cars
  private buildPathCandidates(path: string): string[] {
    const base = this._baseUrl.replace(/\/+$/, '');
    const hasApi = /\/api$/.test(base);

    const basePrimary = base;
    const baseAlt = hasApi ? base.replace(/\/api$/, '') : `${base}/api`;

    const pathNorm = path.startsWith('/') ? path : `/${path}`;
    const pathHyphen = pathNorm.replace(/\/rentalcars(?=\/|$)/, '/rental-cars');

    const set = new Set<string>([
      `${basePrimary}${pathNorm}`,
      `${basePrimary}${pathHyphen}`,
      `${baseAlt}${pathNorm}`,
      `${baseAlt}${pathHyphen}`,
    ]);
    return Array.from(set.values());
  }

  // Intenta múltiples métodos sobre múltiples URLs; se queda con el primer success
  // Intenta múltiples métodos sobre múltiples URLs; se queda con el primer success
  private requestOverCandidates<T>(
    methods: Array<'PATCH' | 'PUT' | 'POST' | 'GET' | 'DELETE'>,
    urls: string[],
    optionsFactory: (method: string, url: string) => { url: string; options: { headers?: HttpHeaders; params?: HttpParams }; body?: any }
  ): Observable<T> {
    const attempts: Array<Observable<T>> = [];

    for (const u of urls) {
      for (const m of methods) {
        const { url, options, body } = optionsFactory(m, u);

        // Fuerza a Angular a usar la sobrecarga "observe: 'body'" => Observable<T>
        const httpOptions = {
          ...options,
          observe: 'body' as const,
          responseType: 'json' as const,
        };

        let req: Observable<T>;
        switch (m) {
          case 'PATCH': req = this.http.patch<T>(url, body ?? {}, httpOptions); break;
          case 'PUT': req = this.http.put<T>(url, body ?? {}, httpOptions); break;
          case 'POST': req = this.http.post<T>(url, body ?? {}, httpOptions); break;
          case 'GET': req = this.http.get<T>(url, httpOptions); break;
          case 'DELETE': req = this.http.request<T>('DELETE', url, httpOptions); break;
          default: req = this.http.get<T>(url, httpOptions); break;
        }

        // si falla, seguimos con el siguiente intento
        attempts.push(req.pipe(catchError(() => (EMPTY as unknown as Observable<T>))));
      }
    }

    return concat(...attempts).pipe(
      take(1), // primer success
      throwIfEmpty(() => new Error('No route/method matched for this endpoint'))
    );
  }


  // ───────── utilidades de precio (útiles en UI) ─────────
  private toISO(d: string | Date): string {
    return new Date(d).toISOString();
  }

  private diasEntre(inicioISO: string, finISO: string): number {
    const ms = new Date(finISO).getTime() - new Date(inicioISO).getTime();
    const d = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return Math.max(1, d);
  }

  public cotizarTotal(
    porDia: number,
    fechaInicio: string | Date,
    fechaFin: string | Date,
    items: Array<{ subtotal: number }> = []
  ): number {
    const inicio = this.toISO(fechaInicio);
    const fin = this.toISO(fechaFin);
    const ndays = this.diasEntre(inicio, fin);
    const base = (porDia || 0) * ndays;
    const extras = items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
    return Math.round((base + extras) * 100) / 100;
  }

  // ───────── RENTAL CARS (nuevo backend) ─────────

  /** LISTAR con filtros del backend nuevo */
  listarCoches(filtro: RentaFiltro = {}): Observable<ListarCochesResp> {
    // Mapeos para compatibilidad con tu UI anterior:
    const mapped: Record<string, any> = { ...(filtro as any) };

    if (mapped['precioMax'] != null && mapped['maxPrecio'] == null) {
      mapped['maxPrecio'] = mapped['precioMax'];
      delete mapped['precioMax'];
    }
    // el backend NO soporta precioMin; lo ignoramos si viene
    delete mapped['precioMin'];

    // si hay rango de fechas, DEBEN ir ambos:
    if ((mapped['fechaInicio'] && !mapped['fechaFin']) || (!mapped['fechaInicio'] && mapped['fechaFin'])) {
      // si falta uno, mejor no mandamos ninguno para evitar 400 del backend
      delete mapped['fechaInicio'];
      delete mapped['fechaFin'];
    }

    // la API actual no usa page/limit/sort; sólo los dejamos fuera
    ['page', 'limit', 'sort'].forEach(k => delete mapped[k]);

    const params = this.toParams(mapped);
    return this.http.get<ListarCochesResp>(`${this.api}`, { params });
  }

  /** MIS COCHES del usuario autenticado*/
  misCoches(): Observable<any[]> {
    const url = `${this._baseUrl}/rentalcars/vehiculos/user`;
    return this.authJsonHeaders$().pipe(
      switchMap((headers) => this.http.get<any[]>(url, { headers })),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** DETALLE por ID */
  cochePorId(id: string): Observable<any> {
    return this.http.get(`${this.api}/${id}`);
  }

  /** CREAR (POST /rental-cars) — maneja imagen principal/galería/TC + JSON parseables */
  addRentalCar(payload: {
    marca: string;
    modelo: string;

    tipoVehiculo?: string;
    pasajeros?: number;
    transmision?: string;
    combustible?: string;

    // precios/depósitos según backend nuevo:
    precio?: number;        // por día
    deposito?: number;
    minDias?: number;

    politicaCombustible?: 'lleno-lleno' | 'como-esta';
    politicaLimpieza?: 'normal' | 'estricta';

    requisitosConductor?: any;
    ubicacion?: any;
    entrega?: any;
    excepcionesNoDisponibles?: any[];

    // flags:
    gps?: boolean; inmovilizador?: boolean; bluetooth?: boolean; aireAcondicionado?: boolean;
    bolsasAire?: number; camaraReversa?: boolean; sensoresEstacionamiento?: boolean;
    quemacocos?: boolean; asientosBebes?: boolean;

    descripcion?: string;
    lote?: string | null;

    // archivos:
    imagenPrincipal: File;
    imagenes?: File[];
    tarjetaCirculacion?: File | null;
  }): Observable<{ message: string; rental: any; token?: string; rol?: string; }> {
    const fd = new FormData();

    // simples (string/number/bool)
    const simples: (keyof typeof payload)[] = [
      'marca', 'modelo', 'tipoVehiculo', 'pasajeros', 'transmision', 'combustible',
      'precio', 'deposito', 'minDias', 'politicaCombustible', 'politicaLimpieza',
      'gps', 'inmovilizador', 'bluetooth', 'aireAcondicionado', 'bolsasAire',
      'camaraReversa', 'sensoresEstacionamiento', 'quemacocos', 'asientosBebes',
      'descripcion'
    ];
    simples.forEach(k => {
      const v = payload[k];
      if (v === undefined || v === null || v === '') return;
      fd.append(k as string, String(v));
    });

    // JSON parseables
    if (payload.requisitosConductor) fd.append('requisitosConductor', JSON.stringify(payload.requisitosConductor));
    if (payload.ubicacion) fd.append('ubicacion', JSON.stringify(payload.ubicacion));
    if (payload.entrega) fd.append('entrega', JSON.stringify(payload.entrega));
    if (payload.excepcionesNoDisponibles) {
      fd.append('excepcionesNoDisponibles', JSON.stringify(payload.excepcionesNoDisponibles));
    }

    // lote (ObjectId o null). null => no enviar; si envías '', lo rechaza create, así que no lo mandamos
    if (payload.lote) fd.append('lote', payload.lote);

    // archivos
    fd.append('imagenPrincipal', payload.imagenPrincipal);
    (payload.imagenes || []).forEach((f) => fd.append('imagenes', f));
    if (payload.tarjetaCirculacion) fd.append('tarjetaCirculacion', payload.tarjetaCirculacion);

    return this.authMultipartHeaders$().pipe(
      switchMap((headers) => this.http.post<{ message: string; rental: any; token?: string; rol?: string; }>(`${this.api}`, fd, { headers })),
      tap((res) => {
        // si promovieron a vendedor, actualiza token/rol
        if (res?.token) {
          localStorage.setItem('token', res.token);
          if (res.rol) localStorage.setItem('rol', res.rol);
        }
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** ACTUALIZAR — soporta imágenes y JSON; tolerante a rutas y método */
  updateRentalCar(
    id: string,
    data: {
      // mismos del create, todos opcionales:
      marca?: string; modelo?: string; tipoVehiculo?: string; pasajeros?: number;
      transmision?: string; combustible?: string; precio?: number; deposito?: number; minDias?: number;
      politicaCombustible?: 'lleno-lleno' | 'como-esta';
      politicaLimpieza?: 'normal' | 'estricta';
      requisitosConductor?: any;
      ubicacion?: any;
      entrega?: any;
      excepcionesNoDisponibles?: any[];
      descripcion?: string;
      lote?: string | null;
      estadoRenta?: 'disponible' | 'rentado' | 'inactivo';

      // flags
      gps?: boolean; inmovilizador?: boolean; bluetooth?: boolean; aireAcondicionado?: boolean;
      bolsasAire?: number; camaraReversa?: boolean; sensoresEstacionamiento?: boolean;
      quemacocos?: boolean; asientosBebes?: boolean;

      // control de imágenes
      imagenesExistentes?: string[]; // lista final a conservar
      imagenPrincipal?: string;      // URL (si no subes file)
      tarjetaCirculacionURL?: string;
    },
    files?: { imagenPrincipal?: File; imagenes?: File[]; tarjetaCirculacion?: File }
  ): Observable<{ message: string; rental: any; }> {
    const urls = this.buildPathCandidates(`/rentalcars/${id}`);
    const hasFiles = !!(files?.imagenPrincipal || files?.imagenes?.length || files?.tarjetaCirculacion);

    if (hasFiles) {
      const fd = new FormData();

      // simples
      Object.entries(data || {}).forEach(([k, v]) => {
        if (v === undefined || v === null) return;

        if (k === 'lote' && v === null) { fd.append('lote', ''); return; } // backend: '' => null
        if (['requisitosConductor', 'ubicacion', 'entrega', 'excepcionesNoDisponibles', 'imagenesExistentes'].includes(k)) {
          fd.append(k, JSON.stringify(v));
        } else {
          // si estás mandando file para imagenPrincipal/TC, no mandes URL duplicada
          if (k === 'imagenPrincipal' && files?.imagenPrincipal) return;
          if (k === 'tarjetaCirculacionURL' && files?.tarjetaCirculacion) return;
          fd.append(k, String(v));
        }
      });

      if (files?.imagenPrincipal) fd.append('imagenPrincipal', files.imagenPrincipal);
      (files?.imagenes || []).forEach(f => fd.append('imagenes', f));
      if (files?.tarjetaCirculacion) fd.append('tarjetaCirculacion', files.tarjetaCirculacion);

      return this.authMultipartHeaders$().pipe(
        switchMap(headers =>
          this.requestOverCandidates<{ message: string; rental: any }>(
            ['PUT'],
            urls,
            (_method, u) => ({ url: u, body: fd, options: { headers } })
          )
        ),
        catchError(err => this.headersService.handleError(err))
      );
    } else {
      // JSON puro
      const body: any = { ...(data || {}) };
      if (body.lote === null) body.lote = ''; // backend usa '' para limpiar el lote

      return this.authJsonHeaders$().pipe(
        switchMap(headers =>
          this.requestOverCandidates<{ message: string; rental: any }>(
<<<<<<< HEAD
            ['PUT'],
=======
            ['PATCH', 'PUT'],
>>>>>>> e09cac2b688350b43fd09a1f9f1fc58dc8b4650b
            urls,
            (_method, u) => ({ url: u, body, options: { headers } })
          )
        ),
        catchError(err => this.headersService.handleError(err))
      );
    }
  }

  /** TOGGLE/SET estado de renta — tolerante: PATCH→PUT + rutas /api y guion */
  toggleEstadoRenta(
    id: string,
    action: 'disponible' | 'rentado' | 'inactivo'
  ): Observable<{ message: string; }> {
    const params = new HttpParams().set('action', action);
    const urls = this.buildPathCandidates(`/rentalcars/${id}/estado`);

    return this.authJsonHeaders$().pipe(
      switchMap(headers =>
        this.requestOverCandidates<{ message: string }>(
          ['PATCH', 'PUT'],
          urls,
          (_method, u) => ({ url: u, options: { headers, params } })
        )
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** DISPONIBILIDAD — tolerante: PATCH→PUT + /api on/off + rentalcars/rental-cars */
  setDisponibilidadCar(
    id: string,
    excepciones: Array<{ inicio: string | Date; fin: string | Date; motivo?: string }> = [],
    entrega?: any | null
  ): Observable<{ message: string; rental: any; }> {
    const normExcepciones = (excepciones || []).map(e => ({
      ...e,
      inicio: new Date(e.inicio).toISOString(),
      fin: new Date(e.fin).toISOString(),
    }));

    const body: any = { excepcionesNoDisponibles: normExcepciones };
    if (entrega !== undefined) body.entrega = entrega; // sólo si quieres actualizar entrega

    const urls = this.buildPathCandidates(`/rentalcars/${id}/disponibilidad`);

    return this.authJsonHeaders$().pipe(
      switchMap(headers =>
        this.requestOverCandidates<{ message: string; rental: any }>(
          ['PUT'],
          urls,
          (_method, u) => ({ url: u, body, options: { headers } })
        )
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** SUGERENCIAS ALEATORIAS (GET /random?id=<opcional>) */
  getRandom(excludeId?: string): Observable<any[]> {
    const params = excludeId ? new HttpParams().set('id', excludeId) : undefined;
    return this.http.get<any[]>(`${this.api}/random`, { params });
  }

  /** POR LOTE (GET /lote/:id) */
  getByLote(loteId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/lote/${loteId}`);
  }

  /** COTIZAR ENTREGA (GET o POST /:id/quote-entrega) */
  quoteEntrega(
    id: string,
    km: number,
    via: 'get' | 'post' = 'get'
  ): Observable<{ km: number; costo: number | null; detalle?: string; }> {
    if (via === 'get') {
      const params = new HttpParams().set('km', String(km));
      return this.http.get<{ km: number; costo: number | null; detalle?: string; }>(`${this.api}/${id}/quote-entrega`, { params });
    }
    return this.authJsonHeaders$().pipe(
      switchMap(headers => this.http.post<{ km: number; costo: number | null; detalle?: string; }>(`${this.api}/${id}/quote-entrega`, { km }, { headers }))
    );
  }

}
