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
import { AcomodoComponent } from "src/app/components/filtos/acomodo/acomodo.component";
import { FooterComponent } from "src/app/components/footer/footer.component";
import { MenuComponent } from "src/app/components/filtos/menu/menu.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LotePageRoutingModule,
    CartasComponent,
    NavbarComponent,
    AcomodoComponent,
    FooterComponent,
    MenuComponent
],
  declarations: [LotePage],
})
export class LotePageModule {}
