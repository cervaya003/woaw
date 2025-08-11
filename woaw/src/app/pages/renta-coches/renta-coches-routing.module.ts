import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RentaCochesPage } from './renta-coches.page';

const routes: Routes = [
  {
    path: '',
    component: RentaCochesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RentaCochesPageRoutingModule {}
