import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DisponibilidadCarPage } from './disponibilidad-car.page';

const routes: Routes = [
  {
    path: '',
    component: DisponibilidadCarPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DisponibilidadCarPageRoutingModule {}
