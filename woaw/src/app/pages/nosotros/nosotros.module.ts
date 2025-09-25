import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { NosotrosPageRoutingModule } from './nosotros-routing.module';
import { NavbarComponent } from '../../components/navbar/navbar.component';

import { FooterComponent } from '../../components/footer/footer.component';
import { NosotrosPage } from './nosotros.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NosotrosPageRoutingModule,
    NavbarComponent,
    FooterComponent
  ],
  declarations: [NosotrosPage]
})
export class NosotrosPageModule {}
