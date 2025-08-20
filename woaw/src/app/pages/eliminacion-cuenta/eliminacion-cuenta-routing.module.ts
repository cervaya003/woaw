import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EliminacionCuentaPage } from './eliminacion-cuenta.page';

const routes: Routes = [
  {
    path: '',
    component: EliminacionCuentaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EliminacionCuentaPageRoutingModule {}
