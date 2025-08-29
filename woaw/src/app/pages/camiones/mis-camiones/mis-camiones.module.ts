import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { MisCamionesPageRoutingModule } from './mis-camiones-routing.module';

// Importamos los componentes reutilizables
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { MenuComponent } from '../../../components/filtos/menu/menu.component';
import { CartasComponent } from '../../../components/cartas/cartas.component';
import { AcomodoComponent } from '../../../components/filtos/acomodo/acomodo.component';
import { FooterComponent } from '../../../components/footer/footer.component';

import { MisCamionesPage } from './mis-camiones.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NavbarComponent,
    MisCamionesPageRoutingModule,
    MenuComponent,
    CartasComponent,
    AcomodoComponent,
    FooterComponent
  ],
  declarations: [MisCamionesPage],
})
export class MisCamionesPageModule {}