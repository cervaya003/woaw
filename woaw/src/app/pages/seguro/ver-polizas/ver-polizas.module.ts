import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { VerPolizasPageRoutingModule } from './ver-polizas-routing.module';
import { VerPolizasPage } from './ver-polizas.page';
import { NavbarComponent } from "src/app/components/navbar/navbar.component";
import { FooterComponent } from "src/app/components/footer/footer.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    VerPolizasPageRoutingModule,
    NavbarComponent,
    FooterComponent
],
  declarations: [VerPolizasPage]
})
export class VerPolizasPageModule {}
