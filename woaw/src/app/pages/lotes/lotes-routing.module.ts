import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LotesPage } from './lotes.page';

const routes: Routes = [
  {
    path: '',
    component: LotesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LotesPageRoutingModule {}
