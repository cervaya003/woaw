import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DisponibilidadCarPageRoutingModule } from './disponibilidad-car-routing.module';

import { DisponibilidadCarPage } from './disponibilidad-car.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DisponibilidadCarPageRoutingModule
  ],
  declarations: [DisponibilidadCarPage]
})
export class DisponibilidadCarPageModule {}
