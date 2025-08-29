import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { HeadersService } from './headers.service';

@Injectable({ providedIn: 'root' })
export class CamionesService {
  constructor(
    private http: HttpClient,
    private headersService: HeadersService
  ) {}

  GetMarcasCamiones(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(
          `${environment.api_key}/camioninfo/marcas-camion`,
          { headers }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  GetModelosCamiones(marca: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(
          `${environment.api_key}/camioninfo/modelos-camion/${encodeURIComponent(marca)}`,
          { headers }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Si ya la tienes en otro servicio, puedes quitarla aquí */
  getRecomendadoCamion(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap(() => this.http.get(`${environment.api_key}/camiones/random`)),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Ejemplo: /cars/id/user  (si es para autos, cámbialo a /camiones si aplica) */
  misCamionesId(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/camiones/id/user`, { headers });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Buscar: por tipo de vehículo o por keywords */
  search(palabra: string, tipoBusqueda: 'tipoVehiculo' | 'keywords'): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        const parametro = (tipoBusqueda === 'tipoVehiculo')
          ? `/vehiculos?tipoVehiculo=${encodeURIComponent(palabra)}`
          : `/vehiculos?keywords=${encodeURIComponent(palabra)}`;
        const url = `${environment.api_key}${parametro}`;
        return this.http.get(url, { headers });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Guardar camión */
  guardarCamion(body: FormData): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getFormDataHeaders(token);
        return this.http.post(`${environment.api_key}/camiones/registrar`, body, { headers });

      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Versiones por marca-modelo-año (asumiendo endpoint) */
  GetVersiones(anio: number, marca: string, modelo: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        const url = `${environment.api_key}/camioninfo/versiones?anio=${anio}&marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(modelo)}`;
        return this.http.get(url, { headers });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
}


