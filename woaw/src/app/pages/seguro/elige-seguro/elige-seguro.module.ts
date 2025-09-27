import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EligeSeguroPageRoutingModule } from './elige-seguro-routing.module';

import { EligeSeguroPage } from './elige-seguro.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EligeSeguroPageRoutingModule
  ],
  declarations: [EligeSeguroPage]
})
export class EligeSeguroPageModule {}
