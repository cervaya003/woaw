import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EditRentaPage } from './edit-renta.page';

const routes: Routes = [
  {
    path: '',
    component: EditRentaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EditRentaPageRoutingModule {}
