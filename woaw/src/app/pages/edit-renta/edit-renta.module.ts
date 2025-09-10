import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EditRentaPageRoutingModule } from './edit-renta-routing.module';

import { EditRentaPage } from './edit-renta.page';
import { FooterComponent } from "src/app/components/footer/footer.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EditRentaPageRoutingModule,
    FooterComponent
],
  declarations: [EditRentaPage]
})
export class EditRentaPageModule {}
