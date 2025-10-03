import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { DetallePolizaPageRoutingModule } from "./detalle-poliza-routing.module";
import { DetallePolizaPage } from "./detalle-poliza.page"; 
import { NavbarComponent } from "src/app/components/navbar/navbar.component";
import { FooterComponent } from "src/app/components/footer/footer.component";
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DetallePolizaPageRoutingModule,
    NavbarComponent,
    FooterComponent
  ],
  declarations: [DetallePolizaPage],
})
export class DetallePolizaPageModule {}
