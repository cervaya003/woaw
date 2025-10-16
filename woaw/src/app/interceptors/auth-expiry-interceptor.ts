import { Injectable, inject } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, EMPTY, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GeneralService } from '../services/general.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthExpiryInterceptor implements HttpInterceptor {
  private general = inject(GeneralService);
  private router = inject(Router);

  // Sólo este backend debe llevar Authorization
  private readonly BACKEND_BASE = 'https://woaw-backend-507962515113.us-central1.run.app/api';

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Saltar requests públicas/externas (sin tocar headers)
    if (this.shouldSkip(req)) {
      return next.handle(req);
    }

    const token = localStorage.getItem('token');
    const shouldAttach = this.shouldAttachToken(req);

    // Agrega Authorization sólo si es nuestro backend y hay token
    const authReq = (token && shouldAttach)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          const sigueValida = this.general?.hasToken?.() ?? false;

          if (!sigueValida) {
            return EMPTY; // tu hasToken ya limpió/avisó/redirigió
          }

          try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('sesionActiva');
          } catch {}

          this.general?.presentToast?.('Tu sesión no es válida. Inicia sesión nuevamente.', 'warning');
          this.router.navigate(['/inicio'], { replaceUrl: true });
          return EMPTY;
        }

        if (err.status === 403) {
          return EMPTY;
        }

        return throwError(() => err);
      })
    );
  }

  // No tocar headers en assets, rutas públicas o hosts externos (Google/Maps/etc.)
  private shouldSkip(req: HttpRequest<any>): boolean {
    const url = req.url || '';

    if (url.startsWith('assets/')) return true;

    const publicPaths = ['/login', '/registro', '/auth', '/autenticacion-user', '/public', '/forgot-password'];
    if (publicPaths.some(p => url.includes(p))) return true;

    const externalHosts = [
      'maps.googleapis.com',
      'maps.gstatic.com',
      'googleapis.com',
      'maps.google',
    ];
    if (externalHosts.some(h => url.includes(h))) return true;

    // Si es URL absoluta y NO es nuestro backend, sáltala (no adjuntar nada)
    try {
      const parsed = new URL(url, window.location.origin);
      if (!parsed.href.startsWith(this.BACKEND_BASE)) return true;
    } catch {
      // URL relativa: no la saltamos aquí
    }

    return false;
    }

  // Sólo adjunta token si la URL es exactamente nuestro backend o '/api' relativo
  private shouldAttachToken(req: HttpRequest<any>): boolean {
    const url = req.url || '';
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.href.startsWith(this.BACKEND_BASE);
    } catch {
      // URL relativa
      return url.startsWith('/api') || url.startsWith('api');
    }
  }
}
