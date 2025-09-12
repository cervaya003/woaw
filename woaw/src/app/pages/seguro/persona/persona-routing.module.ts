import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PersonaPage } from './persona.page';

const routes: Routes = [
  {
    path: '',
    component: PersonaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PersonaPageRoutingModule {}
