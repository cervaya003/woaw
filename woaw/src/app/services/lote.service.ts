import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { GeneralService } from '../services/general.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { HeadersService } from './headers.service';
@Injectable({
  providedIn: 'root'
})
export class LoteService {

  constructor(
    private http: HttpClient,
    private generalService: GeneralService,
    private router: Router,
    private headersService: HeadersService) {

  }

  getlotes(tipo: 'all' | 'mios'): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const endpoint = tipo === 'all' ? '/lotes/' : '/lotes/mis-lotes';
        const headers = this.headersService.getFormDataHeaders(token);
        return this.http.get(`${environment.api_key}${endpoint}`, { headers });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  getcarro(loteId: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap(token => {
        const headers = this.headersService.getFormDataHeaders(token);
        return this.http.get(
          `${environment.api_key}/cars/lote/${loteId}`,
          { headers }
        );
      }),
      catchError(error => this.headersService.handleError(error))
    );
  }

  getmoto(loteId: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap(token => {
        const headers = this.headersService.getFormDataHeaders(token);
        return this.http.get(
          `${environment.api_key}/motos/motos/lote/${loteId}`,
          { headers }
        );
      }),
      catchError(error => this.headersService.handleError(error))
    );
  }

  getLoteById(id: string): Observable<any> {
    // Si eres admin, usa 'all'; si solo quieres los tuyos, usa 'mios'
    // aquí asumimos 'all' para simplificar
    return this.getlotes('all').pipe(
      map(res => {
        const found = res.lotes.find((l: any) => l._id === id);
        if (!found) {
          throw new Error(`Lote ${id} no encontrado`);
        }
        return found;
      })
    );
  }
  editarLote(id: string, datos: FormData): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap(token =>
        this.http.put(
          `${environment.api_key}/lotes/${id}`,
          datos,
          { headers: this.headersService.getFormDataHeaders(token) }
        )
      ),
      catchError(error => this.headersService.handleError(error))
    );
  }
}

