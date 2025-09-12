import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CarsService } from './../../../services/cars.service';
import { Router } from '@angular/router';
import { GeneralService } from '../../../services/general.service';
import { PriceMinPipe } from '../../../pipes/price-min.pipe';
import { CamionesService } from './../../../services/camiones.service';
import { MotosService } from './../../../services/motos.service';

@Component({
  selector: 'app-sugerencias',
  templateUrl: './sugerencias.component.html',
  styleUrls: ['./sugerencias.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, PriceMinPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SugerenciasComponent implements OnInit {
  @Input() idCar: string | null = null;
  autos: any[] = [];

  constructor(
    private carsService: CarsService,
    private router: Router,
    public generalService: GeneralService,
    private camionesService: CamionesService,
    private motosService: MotosService
  ) {}

  ngOnInit() {
    this.peticion();
  }

  ngAfterViewInit(): void {
    // this.generalService.aplicarAnimacionPorScroll('.carrusel-autos');
  }

  async peticion() {
    const url = this.router.url;
    const esCamiones = url.includes('/ficha/camiones/');
    const esMotos    = url.includes('/ficha/motos/');

    if (esCamiones) {
      this.camionesService.getRecomendadoCamion().subscribe({
        next: (res: any) => {
          const lista = Array.isArray(res) ? res : (res?.data ?? res?.camiones ?? []);
          this.autos = (lista || [])
            .filter((x: any) => (x?._id ?? x?.id) !== this.idCar)
            .slice(0, 10); // 2 filas x 5 columnas
        },
        error: (err) => {
          console.error('❌ Error al obtener camiones recomendados:', err);
          this.autos = [];
        },
      });
      return;
    }

    if (esMotos) {
      this.motosService.getMotos().subscribe({
        next: (res: any) => {
          const lista = Array.isArray(res) ? res : (res?.data ?? res?.motos ?? []);
          this.autos = (lista || [])
            .filter((x: any) => (x?._id ?? x?.id) !== this.idCar)
            .slice(0, 10); // 2 filas x 5 columnas
        },
        error: (err) => {
          console.error('❌ Error al obtener motos recomendadas:', err);
          this.autos = [];
        },
      });
      return;
    }

    // --- AUTOS (flujo original) ---
    if (!this.idCar) {
      console.warn('idCar es null, no se puede hacer la petición');
      return;
    }
    this.carsService.getRecomendadoAutos(this.idCar).subscribe({
      next: (res: any[]) => {
        this.autos = (res || [])
          .filter((x: any) => (x?._id ?? x?.id) !== this.idCar)
          .slice(0, 10); // 2 filas x 5 columnas
      },
      error: (err) => {
        console.error('❌ Error al obtener autos recomendados:', err);
      },
    });
  }

  onCardClick(auto: any, event: Event): void {
    const url = this.router.url;
    const tipo =
      url.includes('/ficha/camiones/') ? 'camiones' :
      url.includes('/ficha/motos/')    ? 'motos'    :
      'autos';
    this.router.navigate(['/ficha', tipo, auto._id]);
  }
}
