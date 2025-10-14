import { Injectable, inject } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Observable, EMPTY, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GeneralService } from '../services/general.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthExpiryInterceptor implements HttpInterceptor {
  private general = inject(GeneralService);
  private router = inject(Router);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // No pre-validamos nada → dejamos pasar la request.
    if (this.shouldSkip(req)) {
      return next.handle(req);
    }

    // Solo adjuntamos el token si existe
    const token = localStorage.getItem('token');
    const authReq = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    // Solo si el backend responde 401 ejecutamos hasToken()
    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          // Ejecutar tu validación local (7 días, user shape, etc.)
          const sigueValida = this.general.hasToken();

          if (!sigueValida) {
            // hasToken() ya limpió, avisó y redirigió → cancelamos la cadena
            return EMPTY;
          }

          // Si según el cliente “sigue válida” pero el server dice 401,
          // invalidamos y redirigimos de todos modos.
          try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('sesionActiva');
          } catch { }

          // Si presentToast es pública, mostramos aviso:
          this.general.presentToast('Tu sesión no es válida. Inicia sesión nuevamente.', 'warning');
          this.router.navigate(['/inicio'], { replaceUrl: true });
          return EMPTY;
        }

        if (err.status === 403) {
          // Opcional: tratamiento similar a 401 (depende de tu backend)
          return EMPTY;
        }

        return throwError(() => err);
      })
    );
  }

  private shouldSkip(req: HttpRequest<any>): boolean {
    const url = req.url || '';
    if (url.startsWith('assets/')) return true;
    const publicPaths = ['/login', '/registro', '/auth', '/autenticacion-user', '/public'];
    return publicPaths.some(p => url.includes(p));
  }
}
