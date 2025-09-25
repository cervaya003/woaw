import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PolizaPage } from './poliza.page';

const routes: Routes = [
  {
    path: '',
    component: PolizaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PolizaPageRoutingModule {}
