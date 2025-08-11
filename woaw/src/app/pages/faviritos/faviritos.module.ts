import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FaviritosPageRoutingModule } from './faviritos-routing.module';
// importamos la navbar
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { CartasComponent } from '../../components/cartas/cartas.component';
import { AcomodoComponent } from '../../components/filtos/acomodo/acomodo.component';
import { FooterComponent } from '../../components/footer/footer.component';

import { FaviritosPage } from './faviritos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FaviritosPageRoutingModule,
    NavbarComponent,
    CartasComponent,
    AcomodoComponent,
    FooterComponent
  ],
  declarations: [FaviritosPage],
})
export class FaviritosPageModule {}
