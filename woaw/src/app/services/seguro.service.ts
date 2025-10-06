import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { GeneralService } from '../services/general.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HeadersService } from './headers.service';

export interface CotizacionDTO {
  vehicle: { version: { code: number } };
  region: { postal_code: string };
  person: { gender_code: number | null; birthdate: string; civil_status_code: number | null };
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class SeguroService {
  private UsoCredenciales: 'prueba' | 'produccion' = 'prueba';

  constructor(
    private http: HttpClient,
    private generalService: GeneralService,
    private router: Router,
    private headersService: HeadersService
  ) { }

  getMarcas(): Observable<any> {
    return this.http.get(`${environment.api_key}/crabi/brands`);
  }
  getModelos(marcaId: Number): Observable<any> {
    return this.http.get(`${environment.api_key}/crabi/brands/${marcaId}/types`);
  }
  getAnios(marcaId: Number, modeloId: number): Observable<any> {
    return this.http.get(`${environment.api_key}/crabi/brands/${marcaId}/types/${modeloId}/models`);
  }
  getVersion(marcaId: Number, modeloId: number, anio: number): Observable<any> {
    return this.http.get(`${environment.api_key}/crabi/brands/${marcaId}/types/${modeloId}/models/${anio}/versions`);
  }
  CotizacionEstimada(dto: CotizacionDTO): Observable<any> {
    const url = `${environment.api_key}/crabi/quotation`;
    return this.http.post(url, dto, {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  optenerPaises(): Observable<any> {
    return this.http.get(`${environment.api_key}/info/paises`);
  }
  optenerEstados(): Observable<any> {
    return this.http.get(`${environment.api_key}/info/mexico-states`);
  }
  optenerActEcon(): Observable<any> {
    return this.http.get(`${environment.api_key}/info/actividades-economicas`);
  }
  crearPersona(dto: CotizacionDTO): Observable<any> {
    const url = `${environment.api_key}/crabi/users/register`;
    return this.http.post(url, dto, {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  crearPoliza(dto: any): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.post(`${environment.api_key}/crabi/policy`, dto, { headers });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getPolizas(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/crabi/mypolicies`, { headers });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  pagoPoliza(id: string): Observable<any> {
    return this.http.get(`${environment.api_key}/crabi/checkout/${id}`);
  }
  buscarPersona(value: string): Observable<any> {
    return this.http.post(
      `${environment.api_key}/crabi/person`,
      { value: value },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
