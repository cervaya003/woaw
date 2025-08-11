import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LoteEditPage } from './lote-edit.page';

const routes: Routes = [
  {
    path: '',
    component: LoteEditPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LoteEditPageRoutingModule {}
