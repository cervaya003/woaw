import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

// importamos el componente de splash
import { BienvenidaComponent } from '../../components/bienvenida/bienvenida.component';
// importamos la navbar
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { PrecentacionComponent } from '../../components/landing/precentacion/precentacion.component';
import { HistorealSearchComponent } from '../../components/historeal-search/historeal-search.component';
import { FooterComponent } from '../../components/footer/footer.component';

import { MenuVehiculosPageRoutingModule } from './menu-vehiculos-routing.module';
import { MenuVehiculosPage } from './menu-vehiculos.page';
import { CartasComponent } from "src/app/components/cartas/cartas.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MenuVehiculosPageRoutingModule,
    BienvenidaComponent,
    NavbarComponent,
    PrecentacionComponent,
    HistorealSearchComponent,
    FooterComponent,
    CartasComponent
],
  declarations: [MenuVehiculosPage]
})
export class MenuVehiculosPageModule {}
