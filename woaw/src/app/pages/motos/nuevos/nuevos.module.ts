import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NuevosPageRoutingModule } from './nuevos-routing.module';

import { NuevosPage } from './nuevos.page';

// importamos la navbar
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { CartasComponent } from '../../../components/cartas/cartas.component';
import { AcomodoComponent } from '../../../components/filtos/acomodo/acomodo.component';
import { FooterComponent } from '../../../components/footer/footer.component';
import { MenuComponent } from '../../../components/filtos/menu/menu.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NuevosPageRoutingModule,
    NavbarComponent,
    CartasComponent,
    AcomodoComponent,
    FooterComponent,
    MenuComponent,
  ],
  declarations: [NuevosPage]
})
export class NuevosPageModule {}
