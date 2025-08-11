import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IonicModule } from '@ionic/angular';

import { ArrendamientoPageRoutingModule } from './arrendamiento-routing.module';

import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BienvenidaComponent } from '../../components/bienvenida/bienvenida.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { PrincipalComponent } from '../../components/landing/principal/principal.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { PasosArrendamientoComponent } from '../../components/modal/pasos-arrendamiento/pasos-arrendamiento.component';


import { ArrendamientoPage } from './arrendamiento.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ArrendamientoPageRoutingModule,
    BienvenidaComponent,
    NavbarComponent,
    PrincipalComponent,
    FooterComponent,
    PasosArrendamientoComponent,
    ReactiveFormsModule,
  ],
  declarations: [ArrendamientoPage]
})
export class ArrendamientoPageModule { }
