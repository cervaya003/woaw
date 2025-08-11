import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NuevosPage } from './nuevos.page';

const routes: Routes = [
  {
    path: '',
    component: NuevosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NuevosPageRoutingModule {}
