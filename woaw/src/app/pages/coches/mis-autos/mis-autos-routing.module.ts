import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MisAutosPage } from './mis-autos.page';

const routes: Routes = [
  {
    path: '',
    component: MisAutosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MisAutosPageRoutingModule {}
