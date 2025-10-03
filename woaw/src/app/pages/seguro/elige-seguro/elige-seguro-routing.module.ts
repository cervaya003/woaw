import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EligeSeguroPage } from './elige-seguro.page';

const routes: Routes = [
  {
    path: '',
    component: EligeSeguroPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EligeSeguroPageRoutingModule {}
