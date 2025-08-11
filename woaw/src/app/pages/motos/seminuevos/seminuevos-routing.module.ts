import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SeminuevosPage } from './seminuevos.page';

const routes: Routes = [
  {
    path: '',
    component: SeminuevosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SeminuevosPageRoutingModule {}
