import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MensajesPageRoutingModule } from './mensajes-routing.module';
// importamos la navbar
import { NavbarComponent } from '../../components/navbar/navbar.component';

import { MensajesPage } from './mensajes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MensajesPageRoutingModule,
    NavbarComponent
  ],
  declarations: [MensajesPage]
})
export class MensajesPageModule {}
