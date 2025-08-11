import { Component, Input, OnInit } from '@angular/core';
import { LoteService } from '../../../services/lote.service';
import { GeneralService } from '../../../services/general.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { CartasComponent } from '../../../components/cartas/cartas.component';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-vehiculos',
  templateUrl: './vehiculos.component.html',
  styleUrls: ['./vehiculos.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, CartasComponent, ReactiveFormsModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class VehiculosComponent implements OnInit {
  direccionCompleta: string = 'Obteniendo ubicación...';
  @Input() lote: any | null = null;
  carrosDelLote: any[] = [];
  constructor(
    private generalService: GeneralService,
    private loteservice: LoteService,
    private router: Router
  ) { }

  ngOnInit() {
   // console.log(this.lote);
    this.getCarros();
    this.direcion();
  }

  getCarros() {
    console.log(this.lote._id)
    this.loteservice.getcarro(this.lote._id).subscribe({
      next: async (res) => {
        console.log(res);
        this.carrosDelLote = res;
      },
      error: async (error) => {
        await this.generalService.loadingDismiss();
        await this.generalService.alert(
          'Verifica tu red',
          'Error de red. Intenta más tarde.',
          'danger'
        );
      },
    });
  }

  direcion() {
      if (this.lote.direccion && this.lote.direccion.length > 0) {
        const primerDireccion = this.lote.direccion[0];
        const lat = primerDireccion.lat;
        const lng = primerDireccion.lng;

        this.generalService
          .obtenerDireccionDesdeCoordenadas(lat, lng)
          .then((direccion) => {
            this.direccionCompleta = direccion;
          })
          .catch((error) => {
            this.direccionCompleta = 'No se pudo obtener la dirección.';
            console.warn(error);
          });
      }
  }
    editarLote() {
    this.router.navigate(['/lote-edit', this.lote!._id]);
  }
}
