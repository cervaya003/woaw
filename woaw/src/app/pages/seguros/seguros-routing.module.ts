import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SegurosPage } from './seguros.page';

const routes: Routes = [
  {
    path: '',
    component: SegurosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SegurosPageRoutingModule {}
