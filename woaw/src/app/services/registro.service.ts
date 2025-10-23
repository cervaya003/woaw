import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { HeadersService } from './headers.service';

@Injectable({
  providedIn: 'root',
})
export class RegistroService {
  //  Base de la API disponible como propiedad pública para tu componente
  private readonly _baseUrl = this.normalizeBaseUrl(environment.api_key);
  public get baseUrl(): string {
    return this._baseUrl;
  }

  constructor(
    private http: HttpClient,
    private headersService: HeadersService
  ) { }

  // ───────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────
  private normalizeBaseUrl(url: string): string {
    return (url || '').replace(/\/+$/, '');
  }

  public getGoogleMobileRedirectUrl(platform: 'android' | 'ios' = 'android'): string {
    return `${this.baseUrl}/auth/google/mobile/redirect?platform=${platform}`;
  }

  // ───────────────────────────────────────────────
  // Endpoints
  // ───────────────────────────────────────────────

  preregistro(datos: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/pre-register`, datos);
  }

  renvioCodigo(datos: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/resend-code`, datos);
  }

  validacioncodigo(datos: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/verify-code`, datos);
  }

  registro(datos: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/register`, datos);
  }

  // # LOGIN
  login(datos: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/login`, datos);
  }

  cambiarPassword(data: { password: string; newPassword: string }): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.post(`${this.baseUrl}/users/change-password`, data, { headers });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  recuperacionEmail(datos: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/recover-password`, datos);
  }

  recuperacioCodigo(datos: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/verify-code`, datos);
  }

  recuperacionFinal(datos: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/reset-password`, datos);
  }

  // Web: intercambias el idToken (GIS) por tu token propio
  loginConGoogle(idToken: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/google-login`, { idToken });
  }

  registroLote(datos: FormData): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) =>
        this.http.post(`${this.baseUrl}/lotes/add`, datos, {
          headers: this.headersService.getFormDataHeaders(token),
        })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // antes estabas enviando los headers como body
  misLotes(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) =>
        this.http.post(
          `${this.baseUrl}/lotes/mis-lotes`,
          {},
          { headers: this.headersService.getFormDataHeaders(token) }
        )
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  allLotes(tipo: 'all' | 'mios'): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const endpoint = tipo === 'all' ? '/lotes/' : '/lotes/mis-lotes';
        const headers = this.headersService.getFormDataHeaders(token);
        return this.http.get(`${this.baseUrl}${endpoint}`, { headers });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  deleteAccount(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.request("DELETE", `${this.baseUrl}/account`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  loginConApple(appleData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/apple/login`, appleData);
  }
}
