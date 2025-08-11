import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// Importa ReactiveFormsModule además de FormsModule
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LoteEditPageRoutingModule } from './lote-edit-routing.module';
import { LoteEditPage } from './lote-edit.page';
import { NavbarComponent } from "src/app/components/navbar/navbar.component";
import { FooterComponent } from "src/app/components/footer/footer.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule, // ← Añadido
    IonicModule,
    LoteEditPageRoutingModule,
    NavbarComponent,
    FooterComponent
],
  declarations: [LoteEditPage]
})
export class LoteEditPageModule {}
