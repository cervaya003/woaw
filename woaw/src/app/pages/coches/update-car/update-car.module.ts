import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { UpdateCarPageRoutingModule } from './update-car-routing.module';
// importamos la navbar
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { FooterComponent } from '../../../components/footer/footer.component';

import { UpdateCarPage } from './update-car.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent,
    IonicModule,
    UpdateCarPageRoutingModule,
    FooterComponent
  ],
  declarations: [UpdateCarPage]
})
export class UpdateCarPageModule {}
