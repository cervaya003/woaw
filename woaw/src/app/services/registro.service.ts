import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { HeadersService } from './headers.service';

@Injectable({
  providedIn: 'root',
})
export class RegistroService {
  constructor(
    private http: HttpClient,
    private headersService: HeadersService
  ) { }

  //  ## ----- ----- -----
  //  ## ----- ----- -----

  preregistro(datos: any): Observable<any> {
    return this.http.post(`${environment.api_key}/users/pre-register`, datos);
  }
  renvioCodigo(datos: any): Observable<any> {
    return this.http.post(`${environment.api_key}/users/resend-code`, datos);
  }
  validacioncodigo(datos: any): Observable<any> {
    return this.http.post(`${environment.api_key}/users/verify-code`, datos);
  }
  registro(datos: any): Observable<any> {
    return this.http.post(`${environment.api_key}/users/register`, datos);
  }
  // # LOGIN
  login(datos: any): Observable<any> {
    return this.http.post(`${environment.api_key}/users/login`, datos);
  }
  cambiarPassword(data: {
    password: string;
    newPassword: string;
  }): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.post(
          `${environment.api_key}/users/change-password`,
          data,
          {
            headers,
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  recuperacionEmail(datos: any): Observable<any> {
    return this.http.post(
      `${environment.api_key}/users/recover-password`,
      datos
    );
  }
  recuperacioCodigo(datos: any): Observable<any> {
    return this.http.post(`${environment.api_key}/users/verify-code`, datos);
  }
  recuperacionFinal(datos: any): Observable<any> {
    return this.http.post(`${environment.api_key}/users/reset-password`, datos);
  }
  loginConGoogle(idToken: string): Observable<any> {
    return this.http.post(`${environment.api_key}/users/google-login`, {
      idToken,
    });
  }
  registroLote(datos: FormData): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) =>
        this.http.post(`${environment.api_key}/lotes/add`, datos, {
          headers: this.headersService.getFormDataHeaders(token),
        })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  misLotes(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) =>
        this.http.post(`${environment.api_key}/lotes/mis-lotes`, {
          headers: this.headersService.getFormDataHeaders(token),
        })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  allLotes(tipo: 'all' | 'mios'): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const endpoint = tipo === 'all' ? '/lotes/' : '/lotes/mis-lotes';
        const headers = this.headersService.getFormDataHeaders(token);
        return this.http.get(`${environment.api_key}${endpoint}`, { headers });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }


}
