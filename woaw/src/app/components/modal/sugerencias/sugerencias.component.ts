import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CarsService } from './../../../services/cars.service';
import { Router } from '@angular/router';
import { GeneralService } from '../../../services/general.service';
import { PriceMinPipe } from '../../../pipes/price-min.pipe';

@Component({
  selector: 'app-sugerencias',
  templateUrl: './sugerencias.component.html',
  styleUrls: ['./sugerencias.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule, ReactiveFormsModule, PriceMinPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class SugerenciasComponent implements OnInit {
  @Input() idCar: string | null = null;
  autos: any[] = [];

  constructor(
    private carsService: CarsService,
    private router: Router,
    public generalService: GeneralService
  ) {}

  ngOnInit() {
    this.peticion();
  }
  ngAfterViewInit(): void {
    // this.generalService.aplicarAnimacionPorScroll('.carrusel-autos');
  }
  async peticion() {
    if (!this.idCar) {
      console.warn('idCar es null, no se puede hacer la petición');
      return;
    }
    this.carsService.getRecomendadoAutos(this.idCar).subscribe({
      next: (res) => {
        // this.autos = res.slice(0, 5);
        this.autos = res;
      },
      error: (err) => {
        console.error('❌ Error al obtener autos recomendados:', err);
      },
    });
  }
  onCardClick(auto: any, event: Event): void {
    this.router.navigate(['/ficha', 'autos', auto._id]);
  }
}
