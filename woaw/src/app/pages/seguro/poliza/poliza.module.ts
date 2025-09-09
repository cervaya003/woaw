import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PolizaPageRoutingModule } from './poliza-routing.module';

import { PolizaPage } from './poliza.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PolizaPageRoutingModule
  ],
  declarations: [PolizaPage]
})
export class PolizaPageModule {}
