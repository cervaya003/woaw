import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MisCamionesPage } from './mis-camiones.page';

const routes: Routes = [
  {
    path: '',
    component: MisCamionesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MisCamionesPageRoutingModule {}
