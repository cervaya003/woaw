import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UsadosPage } from './usados.page';

const routes: Routes = [
  {
    path: '',
    component: UsadosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UsadosPageRoutingModule {}
