import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MenuVehiculosPage } from './menu-vehiculos.page';

const routes: Routes = [
  {
    path: '',
    component: MenuVehiculosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MenuVehiculosPageRoutingModule {}
