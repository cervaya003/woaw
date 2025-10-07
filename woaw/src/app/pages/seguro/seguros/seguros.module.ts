import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { SegurosPageRoutingModule } from './seguros-routing.module';
import { SegurosPage } from './seguros.page';
import { ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../components/navbar/navbar.component';
import { MenuComponent } from '../../../components/filtos/menu/menu.component';
import { CartasComponent } from '../../../components/cartas/cartas.component';
import { AddComponent } from '../../../components/lote/add/add.component';
import { AcomodoComponent } from '../../../components/filtos/acomodo/acomodo.component';
import { FooterComponent } from '../../../components/footer/footer.component';
import { SpinnerComponent } from '../../../components/spinner/spinner.component';
import { DynamicIslandComponent } from '../../../components/dynamic-island/dynamic-island.component';
import { OtrosSegurosComponent } from '../../../components/seguros/otros-seguros/otros-seguros.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SegurosPageRoutingModule,
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
  declarations: [SegurosPage]
})
export class SegurosPageModule { }
