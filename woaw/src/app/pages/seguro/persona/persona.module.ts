import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PersonaPageRoutingModule } from './persona-routing.module';

import { PersonaPage } from './persona.page';
import { ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { MenuComponent } from '../../../components/filtos/menu/menu.component';
import { CartasComponent } from '../../../components/cartas/cartas.component';
import { AddComponent } from '../../../components/lote/add/add.component';
import { AcomodoComponent } from '../../../components/filtos/acomodo/acomodo.component';
import { FooterComponent } from '../../../components/footer/footer.component';
import { SpinnerComponent } from '../../../components/spinner/spinner.component';
import { DynamicIslandComponent } from '../../../components/dynamic-island/dynamic-island.component';
import { OtrosSegurosComponent } from '../../../components/otros-seguros/otros-seguros.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PersonaPageRoutingModule,
    NavbarComponent,
    MenuComponent,
    CartasComponent,
    AcomodoComponent,
    FooterComponent,
    AddComponent,
    ReactiveFormsModule,
    SpinnerComponent, 
    DynamicIslandComponent, 
    OtrosSegurosComponent
  ],
  declarations: [PersonaPage]
})
export class PersonaPageModule { }
