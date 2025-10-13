import { Injectable, inject } from '@angular/core';
import { CanActivate, CanActivateChild, CanMatch, Route, UrlSegment, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { GeneralService } from '../services/general.service';

@Injectable({ providedIn: 'root' })
export class AuthPhoneGuard implements CanMatch, CanActivate, CanActivateChild {
  private router = inject(Router);
  private general = inject(GeneralService);

  private checkPhoneAndRedirect(urlIntentada: string): boolean | UrlTree {
    const token   = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');

    // Aquí NO bloquees al no logueado: deja que AuthGuard lo haga.
    if (!token || !rawUser) return true;

    // parse seguro
    let user: any = null;
    try { user = JSON.parse(rawUser); } catch { /* noop */ }

    // intenta múltiples campos
    const candidatos = [
      user?.numero, user?.telefono, user?.phone, user?.celular, user?.mobile, user?.tel,
      user?.contacto?.telefono, user?.contacto?.celular, user?.contact?.phone
    ];

    const crudo        = candidatos.find(v => v != null) ?? '';
    const str          = String(crudo).trim();
    const soloDigitos  = str.replace(/\D+/g, '');

    // Recomendación MX: pide 10 dígitos (celular/lada nacional). Ajusta si usas otra regla.
    const tieneTelefono = soloDigitos.length >= 10;

    // Evita loop si ya estás en autenticación
    const yaEnAuthPhone = urlIntentada.startsWith('/autenticacion-user');

    if (!tieneTelefono && !yaEnAuthPhone) {
      // Usa UrlTree (guard "puro")
      return this.router.createUrlTree(
        ['/autenticacion-user'],
        { queryParams: { next: urlIntentada, step: 'phone' } } // mantén nombres consistentes
      );
    }

    return true;
  }

  canMatch(route: Route, segments: UrlSegment[]): boolean | UrlTree {
    const url = '/' + segments.map(s => s.path).join('/new-car');
    return this.checkPhoneAndRedirect(url || '/new-car');
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.checkPhoneAndRedirect(state.url || '/new-car');
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.checkPhoneAndRedirect(state.url || '/new-car');
  }
}
