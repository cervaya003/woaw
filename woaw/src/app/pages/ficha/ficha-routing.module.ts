import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FichaPage } from './ficha.page';

const routes: Routes = [
  {
    path: '',
    component: FichaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FichaPageRoutingModule {}
