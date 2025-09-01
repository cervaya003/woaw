import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NewCarPageRoutingModule } from './new-car-routing.module';

import { NewCarPage } from './new-car.page';

// importamos la navbar
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { CartasComponent } from '../../components/cartas/cartas.component';
import { AcomodoComponent } from '../../components/filtos/acomodo/acomodo.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { AddComponent } from '../../components/lote/add/add.component';
import { CarComponent } from '../../components/new-veiculo/car/car.component';
import { MotosComponent } from '../../components/new-veiculo/motos/motos.component';
import { RentaComponent } from "src/app/components/new-veiculo/renta/renta.component";
/* import {} */

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NewCarPageRoutingModule,
    NavbarComponent,
    CartasComponent,
    AcomodoComponent,
    FooterComponent,
    CarComponent,
    MotosComponent,
    AddComponent,
    RentaComponent
],
  declarations: [NewCarPage],
})
export class NewCarPageModule { }
