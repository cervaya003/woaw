import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HomePageRoutingModule } from './home-routing.module';
// importamos el componente de splash
import { BienvenidaComponent } from '../../components/bienvenida/bienvenida.component';
// importamos la navbar
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { PrincipalComponent } from '../../components/landing/principal/principal.component';
import { HistorealSearchComponent } from '../../components/historeal-search/historeal-search.component';
import { PrecentacionComponent } from '../../components/landing/precentacion/precentacion.component';
import { JoliComponent } from '../../components/landing/joli/joli.component';
import { FooterComponent } from '../../components/footer/footer.component';

import { ReactiveFormsModule } from '@angular/forms';

import { HomePage } from './home.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    BienvenidaComponent,
    NavbarComponent,
    ReactiveFormsModule,
    FooterComponent,
    PrincipalComponent,
    HistorealSearchComponent,
    PrecentacionComponent,
    JoliComponent
  ],
  declarations: [HomePage],
})
export class HomePageModule { }
