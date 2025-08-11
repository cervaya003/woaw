import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MisMotosPage } from './mis-motos.page';

const routes: Routes = [
  {
    path: '',
    component: MisMotosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MisMotosPageRoutingModule {}
