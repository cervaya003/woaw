import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { UsadosPageRoutingModule } from './usados-routing.module';

import { UsadosPage } from './usados.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    UsadosPageRoutingModule
  ],
  declarations: [UsadosPage]
})
export class UsadosPageModule {}
