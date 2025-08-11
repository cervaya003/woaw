import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ArrendamientoPage } from './arrendamiento.page';

const routes: Routes = [
  {
    path: '',
    component: ArrendamientoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ArrendamientoPageRoutingModule {}
