import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { PoliticasPageRoutingModule } from './politicas-routing.module';
import { PoliticasPage } from './politicas.page';
import { FooterComponent } from "src/app/components/footer/footer.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    PoliticasPageRoutingModule,
    FooterComponent
],
  declarations: [PoliticasPage],
})
export class PoliticasPageModule {}
