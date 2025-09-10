import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DisponibilidadCarPageRoutingModule } from './disponibilidad-car-routing.module';

import { DisponibilidadCarPage } from './disponibilidad-car.page';
import { FooterComponent } from "src/app/components/footer/footer.component";
import { NavbarComponent } from "src/app/components/navbar/navbar.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DisponibilidadCarPageRoutingModule,
    FooterComponent,
    NavbarComponent
],
  declarations: [DisponibilidadCarPage]
})
export class DisponibilidadCarPageModule {}
