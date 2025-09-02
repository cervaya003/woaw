import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { TodosPageRoutingModule } from './todos-routing.module';

import { TodosPage } from './todos.page';
import { AcomodoComponent } from "src/app/components/filtos/acomodo/acomodo.component";
import { MenuComponent } from "src/app/components/filtos/menu/menu.component";
import { CartasComponent } from "src/app/components/cartas/cartas.component";
import { FooterComponent } from "src/app/components/footer/footer.component";
import { NavbarComponent } from '../../../components/navbar/navbar.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TodosPageRoutingModule,
    AcomodoComponent,
    MenuComponent,
    CartasComponent,
    FooterComponent,
    NavbarComponent
],
  declarations: [TodosPage]
})
export class TodosPageModule {}
