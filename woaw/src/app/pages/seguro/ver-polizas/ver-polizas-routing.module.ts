import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VerPolizasPage } from './ver-polizas.page';

const routes: Routes = [
  {
    path: '',
    component: VerPolizasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VerPolizasPageRoutingModule {}
