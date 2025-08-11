import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { UsadosPageRoutingModule } from './usados-routing.module';
// importamos la navbar
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { MenuComponent } from '../../../components/filtos/menu/menu.component';
import { CartasComponent } from '../../../components/cartas/cartas.component';
import { AcomodoComponent } from '../../../components/filtos/acomodo/acomodo.component';
import { FooterComponent } from '../../../components/footer/footer.component';

import { UsadosPage } from './usados.page';

@NgModule({
  imports: [
    CommonModule,
    NavbarComponent,
    FormsModule,
    IonicModule,
    UsadosPageRoutingModule,
    MenuComponent,
    CartasComponent,
    AcomodoComponent,
    FooterComponent,
  ],
  declarations: [UsadosPage],
})
export class UsadosPageModule {}
