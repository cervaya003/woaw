import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RentaFichaPageRoutingModule } from './renta-ficha-routing.module';

import { RentaFichaPage } from './renta-ficha.page';
import { FooterComponent } from "src/app/components/footer/footer.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RentaFichaPageRoutingModule,
    FooterComponent
],
  declarations: [RentaFichaPage]
})
export class RentaFichaPageModule {}
