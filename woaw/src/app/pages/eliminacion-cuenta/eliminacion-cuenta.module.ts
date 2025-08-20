import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EliminacionCuentaPageRoutingModule } from './eliminacion-cuenta-routing.module';

import { EliminacionCuentaPage } from './eliminacion-cuenta.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EliminacionCuentaPageRoutingModule
  ],
  declarations: [EliminacionCuentaPage]
})
export class EliminacionCuentaPageModule {}
