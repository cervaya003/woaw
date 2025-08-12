// src/app/pages/lote/lote.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

import { LotePageRoutingModule } from './lote-routing.module';
import { LotePage } from './lote.page';

// CartasComponent es standalone → se importa directamente
import { CartasComponent } from '../../components/cartas/cartas.component';
import { NavbarComponent } from "src/app/components/navbar/navbar.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LotePageRoutingModule,
    CartasComponent,
    NavbarComponent
],
  declarations: [LotePage],
})
export class LotePageModule {}
