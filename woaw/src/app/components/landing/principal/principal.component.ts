import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import {
  AbstractControl,
  ValidatorFn,
  ValidationErrors,
  FormGroup,
} from '@angular/forms';

import { HttpClient } from '@angular/common/http';
import { AlertController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { GeneralService } from '../../../services/general.service';
import { CarsService } from '../../../services/cars.service';

@Component({
  selector: 'app-principal',
  templateUrl: './principal.component.html',
  styleUrls: ['./principal.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class PrincipalComponent implements OnInit {
  autosNuevos: any[] = [];
  autosSeminuevos: any[] = [];
  autosUsados: any[] = [];
  Dispositivo: 'telefono' | 'tablet' | 'computadora' = 'computadora';
  public conUsados: number = 0;
  public conSeminuevos: number = 0;
  public conNuevos: number = 0;

  constructor(
    public carsService: CarsService,
    public generalService: GeneralService,
    private router: Router
  ) { }

  ngOnInit() {
    this.generalService.dispositivo$.subscribe((tipo: 'telefono' | 'tablet' | 'computadora') => {
      this.Dispositivo = tipo;
    });

    this.getCarsNews();
    this.getCarsSeminuevos();
    this.getCarsUsados();
  }
  ngAfterViewInit(): void {
    this.generalService.aplicarAnimacionPorScroll(
      '.carrusel-autos_minicartas'
    );
  }
  getCarsNews() {
    this.carsService.getCarsNews().subscribe({
      next: (res: any) => {
        this.conNuevos = res.contador;
        const autos = res?.coches || []
        this.autosNuevos = autos.map((car: any) => ({
          ...car,
          precioMin: Math.min(...car.version.map((v: any) => v.Precio)),
        }))
          .sort((a: { precioMin: number }, b: { precioMin: number }) => a.precioMin - b.precioMin)
          .slice(Math.floor((autos.length - 4) / 2), Math.floor((autos.length - 4) / 2) + 4);

      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('Error de Conexión', mensaje);
      },
    });
  }
  getCarsSeminuevos() {
    this.carsService.getCarsSeminuevos().subscribe({
      next: (res: any) => {
        this.conSeminuevos = res.contador;
        const autos = res?.coches || []
        this.autosSeminuevos = autos.slice(0, 4);
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('Error de Conexión', mensaje);
      },
    });
  }
  getCarsUsados() {
    this.carsService.getCarsUsados().subscribe({
      next: (res: any) => {
        this.conUsados = res.contador;
        const autos = res?.coches || []
        this.autosUsados = autos.slice(0, 4);
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('Error de Conexión', mensaje);
      },
    });
  }
  verMas(url: string) {
    this.router.navigate([url]);
  }
  onCardClick(auto: any, event: Event): void {
    this.router.navigate(['/ficha', 'autos', auto._id]);
  }
}
