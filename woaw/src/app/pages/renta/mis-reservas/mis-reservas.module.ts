import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MisReservasPageRoutingModule } from './mis-reservas-routing.module';

import { MisReservasPage } from './mis-reservas.page';
import { NavbarComponent } from "src/app/components/navbar/navbar.component";
import { FooterComponent } from "src/app/components/footer/footer.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MisReservasPageRoutingModule,
    NavbarComponent,
    FooterComponent
],
  declarations: [MisReservasPage]
})
export class MisReservasPageModule {}
