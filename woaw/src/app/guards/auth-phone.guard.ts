import { Injectable, inject } from '@angular/core';
import { CanActivate, CanActivateChild, CanMatch, Route, UrlSegment, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { GeneralService } from '../services/general.service';

@Injectable({
  providedIn: 'root'
})
export class AuthPhoneGuard implements CanMatch, CanActivate, CanActivateChild {
  private router = inject(Router);
  private general = inject(GeneralService);

  private checkPhoneAndRedirect(urlIntentada: string): boolean {
    const token = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');

    // Si no está logueado, no bloquees aquí (otro guard o la propia ruta se encarga)
    if (!token || !rawUser) return true;

    // Reusa el helper del service si quieres, o haz la validación aquí:
    const user = JSON.parse(rawUser);
    const candidatos = [
      user?.numero, user?.telefono, user?.phone, user?.celular, user?.mobile, user?.tel,
      user?.contacto?.telefono, user?.contacto?.celular, user?.contact?.phone
    ];
    const crudo = candidatos.find(v => v !== null && v !== undefined) ?? '';
    const str = String(crudo).trim();
    const soloDigitos = str.replace(/\D+/g, '');
    const tieneTelefono = soloDigitos.length >= 7;

    if (!tieneTelefono) {
      // evita loop si ya estás en autenticacion-user
      if (!urlIntentada.startsWith('/autenticacion-user')) {
        this.router.navigate(
          ['/autenticacion-user'],
          { queryParams: { next: urlIntentada }, replaceUrl: true }
        );
      }
      return false; // bloquea la navegación
    }

    return true; // deja pasar
  }

  // ---- CanMatch (recomendado en Angular moderno)
  canMatch(route: Route, segments: UrlSegment[]): boolean {
    const url = '/' + segments.map(s => s.path).join('/');
    return this.checkPhoneAndRedirect(url || '/');
  }

  // ---- CanActivate (si lo necesitas en rutas concretas)
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.checkPhoneAndRedirect(state.url || '/');
  }

  // ---- CanActivateChild (para módulos con children)
  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.checkPhoneAndRedirect(state.url || '/');
  }
}
