import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { GeneralService } from '../services/general.service';

@Injectable({
  providedIn: 'root',
})
export class NotAuthGuard implements CanActivate {
  constructor(private generalService: GeneralService, private router: Router) {}

  canActivate(): boolean {
    if (!this.generalService.tokenPresente()) {
      return true;
    } else {
      this.router.navigate(['home']);
      return false;
    }
  }
}
