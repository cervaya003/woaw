
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { CheckoutPageRoutingModule } from './checkout-routing.module';
import { CheckOutPage } from './checkout.page';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CheckoutPageRoutingModule,
  ],
  declarations: [CheckOutPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // opcional si ya usas IonicModule, pero ayuda a suprimir warnings

})
export class CheckoutPageModule {}
