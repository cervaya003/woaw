import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AutenticacionUserPage } from './autenticacion-user.page';

const routes: Routes = [
  {
    path: '',
    component: AutenticacionUserPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AutenticacionUserPageRoutingModule {}
