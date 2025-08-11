import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NewCarPage } from './new-car.page';

const routes: Routes = [
  {
    path: '',
    component: NewCarPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NewCarPageRoutingModule {}
