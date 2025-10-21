import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EliminacionCuentaPageRoutingModule } from './eliminacion-cuenta-routing.module';

import { EliminacionCuentaPage } from './eliminacion-cuenta.page';
import { NavbarComponent } from "src/app/components/navbar/navbar.component";
import { FooterComponent } from "src/app/components/footer/footer.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EliminacionCuentaPageRoutingModule,
    NavbarComponent,
    FooterComponent
],
  declarations: [EliminacionCuentaPage]
})
export class EliminacionCuentaPageModule {}
