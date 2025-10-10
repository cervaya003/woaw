import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { GeneralService } from '../services/general.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HeadersService {
  public isLoggedIn: boolean = false;
  public MyRole: string | null = null;

  constructor(
    private http: HttpClient,
    private generalService: GeneralService,
    private router: Router
  ) {
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    this.generalService.tipoRol$.subscribe((rol) => {
      this.MyRole = rol;
    });
  }

  //  ## ----- ----- -----
  //  ## ----- ----- -----

  async obtenerToken(): Promise<string | null> {
    return localStorage.getItem('token');
  }

  //  Cabeceras para JSON
  getJsonHeaders(token: string | null): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`,
      'Content-Type': 'application/json',
      'x-api-key': environment.public_key,
      "x-ambiente": environment.crabi_status,
      // "x-ambiente": "production" 
    });
  }

  //  Cabeceras para FormData (sin Content-Type manual)
  getFormDataHeaders(token: string | null): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`,
      "x-ambiente": environment.crabi_status,
    });
  }

  handleError(error: any): Observable<never> {
    this.generalService.loadingDismiss();
    const mensaje = error?.error?.message;

    if (
      error.status === 401 &&
      (mensaje === 'No se proporcionó un token' ||
        mensaje === 'Token no válido')
    ) {
      this.generalService.eliminarToken();
      this.router.navigate(['/inicio']);
    }

    throw error;
  }
}
