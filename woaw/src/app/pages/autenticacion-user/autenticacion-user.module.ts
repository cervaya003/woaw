import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AutenticacionUserPageRoutingModule } from './autenticacion-user-routing.module';

import { AutenticacionUserPage } from './autenticacion-user.page';
import { FooterComponent } from "src/app/components/footer/footer.component";

import { NavbarComponent } from '../../components/navbar/navbar.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    AutenticacionUserPageRoutingModule,
    FooterComponent,
    NavbarComponent
],
 
  declarations: [AutenticacionUserPage]
})
export class AutenticacionUserPageModule { }
