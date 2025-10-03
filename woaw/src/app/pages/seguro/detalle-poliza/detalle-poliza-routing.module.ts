import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DetallePolizaPage } from './detalle-poliza.page';

const routes: Routes = [
  {
    path: '',
    component: DetallePolizaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DetallePolizaPageRoutingModule {}
