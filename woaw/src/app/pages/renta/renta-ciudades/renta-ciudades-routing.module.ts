import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RentaCiudadesPage } from './renta-ciudades.page';

const routes: Routes = [
  {
    path: '',
    component: RentaCiudadesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RentaCiudadesPageRoutingModule {}
