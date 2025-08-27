import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { NewCarPageRoutingModule } from './new-car-routing.module';
import { NewCarPage } from './new-car.page';

// Componentes compartidos
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { CartasComponent } from '../../components/cartas/cartas.component';
import { AcomodoComponent } from '../../components/filtos/acomodo/acomodo.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { AddComponent } from '../../components/lote/add/add.component';

// Formularios existentes
import { CarComponent } from '../../components/new-veiculo/car/car.component';
import { MotosComponent } from '../../components/new-veiculo/motos/motos.component';
import { CamionComponent } from '../../components/new-veiculo/camion/camion.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NewCarPageRoutingModule,

    // compartidos
    NavbarComponent,
    CartasComponent,
    AcomodoComponent,
    FooterComponent,
    AddComponent,

    // formularios
    CarComponent,
    MotosComponent,
    CamionComponent, // <- necesario para usar <app-camion> en new-car.html
  ],
  declarations: [NewCarPage],
})
export class NewCarPageModule {}
