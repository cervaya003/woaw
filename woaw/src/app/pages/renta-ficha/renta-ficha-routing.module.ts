import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RentaFichaPage } from './renta-ficha.page';

const routes: Routes = [
  {
    path: '',
    component: RentaFichaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RentaFichaPageRoutingModule {}
