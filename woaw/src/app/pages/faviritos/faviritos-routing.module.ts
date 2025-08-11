import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FaviritosPage } from './faviritos.page';

const routes: Routes = [
  {
    path: '',
    component: FaviritosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FaviritosPageRoutingModule {}
