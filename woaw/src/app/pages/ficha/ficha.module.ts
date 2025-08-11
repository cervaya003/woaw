import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FichaPageRoutingModule } from './ficha-routing.module';
import { FooterComponent } from '../../components/footer/footer.component';
import { SugerenciasComponent } from '../../components/modal/sugerencias/sugerencias.component';
import { CollageFichaComponent } from '../../components/collage-ficha/collage-ficha.component';
import { CotizadorComponent } from './../../components/cotizador/cotizador.component';

import { FichaPage } from './ficha.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FichaPageRoutingModule,
    FooterComponent,
    CollageFichaComponent,
    SugerenciasComponent,
    CotizadorComponent
  ],
  declarations: [FichaPage],
})
export class FichaPageModule {}
