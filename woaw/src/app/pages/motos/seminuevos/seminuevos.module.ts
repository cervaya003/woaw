import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SeminuevosPageRoutingModule } from './seminuevos-routing.module';

import { SeminuevosPage } from './seminuevos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SeminuevosPageRoutingModule
  ],
  declarations: [SeminuevosPage]
})
export class SeminuevosPageModule {}
