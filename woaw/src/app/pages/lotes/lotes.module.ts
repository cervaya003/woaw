import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { LotesPageRoutingModule } from './lotes-routing.module';
import { LotesPage } from './lotes.page';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { MenuComponent } from '../../components/filtos/menu/menu.component';
import { CartasComponent } from '../../components/cartas/cartas.component';
import { AddComponent } from '../../components/lote/add/add.component';
import { AcomodoComponent } from '../../components/filtos/acomodo/acomodo.component';
import { FooterComponent } from '../../components/footer/footer.component';
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LotesPageRoutingModule,
    NavbarComponent,
    MenuComponent,
    CartasComponent,
    AcomodoComponent,
    FooterComponent,
    AddComponent,
  ],
  declarations: [LotesPage]
})
export class LotesPageModule { }
