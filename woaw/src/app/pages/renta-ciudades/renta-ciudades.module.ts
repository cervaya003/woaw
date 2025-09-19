import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RentaCiudadesPageRoutingModule } from './renta-ciudades-routing.module';

import { RentaCiudadesPage } from './renta-ciudades.page';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';
 
 

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RentaCiudadesPageRoutingModule,
    NavbarComponent,
    FooterComponent
],
  declarations: [RentaCiudadesPage]
})
export class RentaCiudadesPageModule {}
