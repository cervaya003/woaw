import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { RentaCochesPageRoutingModule } from './renta-coches-routing.module';
import { RentaCochesPage } from './renta-coches.page';

import { NavbarComponent } from '../../components/navbar/navbar.component';
import { MenuComponent } from '../../components/filtos/menu/menu.component';
import { AddComponent } from '../../components/lote/add/add.component';
import { AcomodoComponent } from '../../components/filtos/acomodo/acomodo.component';
import { FooterComponent } from '../../components/footer/footer.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RentaCochesPageRoutingModule,
    NavbarComponent,
    MenuComponent,
    AcomodoComponent,
    FooterComponent,
    AddComponent
  ],
  declarations: [RentaCochesPage]
})
export class RentaCochesPageModule {}
