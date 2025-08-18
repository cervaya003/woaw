import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { GeneralService } from '../services/general.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HeadersService } from './headers.service';

@Injectable({
  providedIn: 'root',
})
export class MotosService {
  constructor(
    private http: HttpClient,
    private generalService: GeneralService,
    private router: Router,
    private headersService: HeadersService
  ) {}

  //  ## ----- ----- -----
  //  ## ----- ----- -----

  // ☢️ ## ----- PETICIONES

  getMarcas(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/motosinfo/marcas-moto`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  GetModelos(idMarca: string): Observable<any> {
    // this.generalService.loading('Obteniendo modelos...');
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        this.generalService.loadingDismiss();
        return this.http.get(
          `${environment.api_key}/motosinfo/modelos-moto/${idMarca}`,
          {
            headers,
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  guardarMoto(datos: FormData): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) =>
        this.http.post(`${environment.api_key}/motos/registrar`, datos, {
          headers: this.headersService.getFormDataHeaders(token),
        })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  misMotosId(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/motos/motos/user`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getMotos(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/motos/random`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getMoto(id: any): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/motos/motos/${id}`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  putMoto(carId: string, datos: FormData | string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const isFormData = datos instanceof FormData;
        const headers = isFormData
          ? this.headersService.getFormDataHeaders(token)
          : this.headersService.getJsonHeaders(token);

        return this.http.request(
          'put',
          `${environment.api_key}/motos/motos/${carId}`,
          {
            headers,
            body: datos,
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  deleteMoto(carId: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.request(
          'DELETE',
          `${environment.api_key}/motos/motos/${carId}`,
          {
            headers,
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getMarcas_all(): Observable<any> {
    // this.generalService.loading('Obteniendo marcas...');
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        this.generalService.loadingDismiss();
        return this.http.get(`${environment.api_key}/motosinfo/marcas-moto`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
}
