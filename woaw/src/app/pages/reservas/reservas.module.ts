import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ReservasPageRoutingModule } from './reservas-routing.module';
import { ReservasPage } from './reservas.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,   // 👈 IMPORTANTE
    IonicModule,
    ReservasPageRoutingModule,
  ],
  declarations: [ReservasPage],
})
export class ReservasPageModule { }
