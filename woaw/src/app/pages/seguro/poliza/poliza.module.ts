import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PolizaPageRoutingModule } from './poliza-routing.module';

import { PolizaPage } from './poliza.page';
import { ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { MenuComponent } from '../../../components/filtos/menu/menu.component';
import { CartasComponent } from '../../../components/cartas/cartas.component';
import { AddComponent } from '../../../components/lote/add/add.component';
import { AcomodoComponent } from '../../../components/filtos/acomodo/acomodo.component';
import { FooterComponent } from '../../../components/footer/footer.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PolizaPageRoutingModule,
    NavbarComponent,
    MenuComponent,
    CartasComponent,
    AcomodoComponent,
    FooterComponent,
    AddComponent,
    ReactiveFormsModule
  ],
  declarations: [PolizaPage]
})
export class PolizaPageModule { }
