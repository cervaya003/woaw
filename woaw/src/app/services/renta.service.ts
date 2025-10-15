import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from, EMPTY, concat } from 'rxjs';
import { switchMap, catchError, map, tap, take, throwIfEmpty } from 'rxjs/operators';
import { HeadersService } from './headers.service';

export interface RentaFiltro {
  estadoRenta?: 'disponible' | 'rentado' | 'inactivo';
  ciudad?: string;
  estado?: string;
  marca?: string;
  modelo?: string;
  minPasajeros?: number;
  maxPrecio?: number;
  precioMin?: number;
  precioMax?: number;
  fechaInicio?: string;
  fechaFin?: string;
  page?: number;
  limit?: number;
  sort?: string;
  [key: string]: any;
}

export interface ListarCochesResp {
  data: any[];
  autos: any[];
  contador: number;
  rentals: any[];
  estado?: string;
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
        return h.delete('Content-Type');
      })
    );
  }

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

  private requestOverCandidates<T>(
    methods: Array<'PATCH' | 'PUT' | 'POST' | 'GET' | 'DELETE'>,
    urls: string[],
    optionsFactory: (method: string, url: string) => { url: string; options: { headers?: HttpHeaders; params?: HttpParams }; body?: any }
  ): Observable<T> {
    const attempts: Array<Observable<T>> = [];

    for (const u of urls) {
      for (const m of methods) {
        const { url, options, body } = optionsFactory(m, u);
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

        attempts.push(req.pipe(catchError(() => (EMPTY as unknown as Observable<T>))));
      }
    }

    return concat(...attempts).pipe(
      take(1), // primer success
      throwIfEmpty(() => new Error('No route/method matched for this endpoint'))
    );
  }

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

  listarCoches(filtro: RentaFiltro = {}): Observable<ListarCochesResp> {
    const mapped: Record<string, any> = { ...(filtro as any) };

    if (mapped['precioMax'] != null && mapped['maxPrecio'] == null) {
      mapped['maxPrecio'] = mapped['precioMax'];
      delete mapped['precioMax'];
    }
    delete mapped['precioMin'];
    if ((mapped['fechaInicio'] && !mapped['fechaFin']) || (!mapped['fechaInicio'] && mapped['fechaFin'])) {
      delete mapped['fechaInicio'];
      delete mapped['fechaFin'];
    }

    ['page', 'limit', 'sort'].forEach(k => delete mapped[k]);

    const params = this.toParams(mapped);
    return this.http.get<ListarCochesResp>(`${this.api}`, { params });
  }

  misCoches(): Observable<any[]> {
    const url = `${this._baseUrl}/rentalcars/vehiculos/user`;
    return this.authJsonHeaders$().pipe(
      switchMap((headers) => this.http.get<any[]>(url, { headers })),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  cochePorId(id: string): Observable<any> {
    return this.http.get(`${this.api}/${id}`);
  }

  addRentalCar(payload: {
    marca: string;
    modelo: string;
    tipoVehiculo?: string;
    pasajeros?: number;
    transmision?: string;
    combustible?: string;
    precio?: number;        // por día
    deposito?: number;
    minDias?: number;
    politicaCombustible?: 'lleno-lleno' | 'como-esta';
    politicaLimpieza?: 'normal' | 'estricta';
    requisitosConductor?: any;
    ubicacion?: any;
    entrega?: any;
    excepcionesNoDisponibles?: any[];
    gps?: boolean; inmovilizador?: boolean; bluetooth?: boolean; aireAcondicionado?: boolean;
    bolsasAire?: number; camaraReversa?: boolean; sensoresEstacionamiento?: boolean;
    quemacocos?: boolean; asientosBebes?: boolean;
    descripcion?: string;
    lote?: string | null;
    imagenPrincipal: File;
    imagenes?: File[];
    tarjetaCirculacion?: File | null;
  }): Observable<{ message: string; rental: any; token?: string; rol?: string; }> {
    const fd = new FormData();
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

    if (payload.requisitosConductor) fd.append('requisitosConductor', JSON.stringify(payload.requisitosConductor));
    if (payload.ubicacion) fd.append('ubicacion', JSON.stringify(payload.ubicacion));
    if (payload.entrega) fd.append('entrega', JSON.stringify(payload.entrega));
    if (payload.excepcionesNoDisponibles) {
      fd.append('excepcionesNoDisponibles', JSON.stringify(payload.excepcionesNoDisponibles));
    }

    if (payload.lote) fd.append('lote', payload.lote);

    fd.append('imagenPrincipal', payload.imagenPrincipal);
    (payload.imagenes || []).forEach((f) => fd.append('imagenes', f));
    if (payload.tarjetaCirculacion) fd.append('tarjetaCirculacion', payload.tarjetaCirculacion);

    return this.authMultipartHeaders$().pipe(
      switchMap((headers) => this.http.post<{ message: string; rental: any; token?: string; rol?: string; }>(`${this.api}`, fd, { headers })),
      tap((res) => {
        if (res?.token) {
          localStorage.setItem('token', res.token);
          if (res.rol) localStorage.setItem('rol', res.rol);
        }
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  updateRentalCar(
    id: string,
    data: {
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
      gps?: boolean; inmovilizador?: boolean; bluetooth?: boolean; aireAcondicionado?: boolean;
      bolsasAire?: number; camaraReversa?: boolean; sensoresEstacionamiento?: boolean;
      quemacocos?: boolean; asientosBebes?: boolean;
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

      Object.entries(data || {}).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (k === 'lote' && v === null) { fd.append('lote', ''); return; } // backend: '' => null
        if (['requisitosConductor', 'ubicacion', 'entrega', 'excepcionesNoDisponibles', 'imagenesExistentes'].includes(k)) {
          fd.append(k, JSON.stringify(v));
        } else {
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
      const body: any = { ...(data || {}) };
      if (body.lote === null) body.lote = '';
      return this.authJsonHeaders$().pipe(
        switchMap(headers =>
          this.requestOverCandidates<{ message: string; rental: any }>(
            ['PUT'],
            urls,
            (_method, u) => ({ url: u, body, options: { headers } })
          )
        ),
        catchError(err => this.headersService.handleError(err))
      );
    }
  }

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

  getRandom(excludeId?: string): Observable<any[]> {
    const params = excludeId ? new HttpParams().set('id', excludeId) : undefined;
    return this.http.get<any[]>(`${this.api}/random`, { params });
  }

  getByLote(loteId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/lote/${loteId}`);
  }

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

  private expandUtcRangeToYmdList(iniIso: string, finIso: string): string[] {
    if (!iniIso || !finIso) return [];
    let s = new Date(iniIso);
    let e = new Date(finIso);
    if (isNaN(+s) || isNaN(+e)) return [];
    if (+e < +s) [s, e] = [e, s];

    const out: string[] = [];
    const startUTC = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
    const endUTC = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));

    for (let d = new Date(startUTC); d <= endUTC; d.setUTCDate(d.getUTCDate() + 1)) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      out.push(`${y}-${m}-${day}`);
    }
    return out;
  }

  private diasBloqueadosPorExcepciones(coche: any): string[] {
    const exc: Array<{ inicio: string; fin: string }> = Array.isArray(coche?.excepcionesNoDisponibles)
      ? (coche.excepcionesNoDisponibles as Array<{ inicio: string; fin: string }>)
      : [];
    return exc.reduce((acc: string[], r: { inicio: string; fin: string }) => {
      const dias = this.expandUtcRangeToYmdList(r.inicio, r.fin);
      return acc.concat(dias);
    }, []);
  }


  diasNoDisponibles(id: string): Observable<string[]> {
    return this.cochePorId(id).pipe(
      map(coche => this.diasBloqueadosPorExcepciones(coche))
    );
  }
}
