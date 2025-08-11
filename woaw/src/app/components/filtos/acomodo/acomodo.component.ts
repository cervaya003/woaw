import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RegistroService } from '../../../services/registro.service';
import { GeneralService } from '../../../services/general.service';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { CarsService } from '../../../services/cars.service';

@Component({
  selector: 'app-acomodo',
  templateUrl: './acomodo.component.html',
  styleUrls: ['./acomodo.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class AcomodoComponent implements OnInit {
  @Input() totalAutos: number | null = null;
  @Input() titulo: string  | null = null;
  ordenSeleccionado: string = 'nuevo';
  @Output() ordenCambio = new EventEmitter<string>();


  esDispositivoMovil: boolean = false;

  constructor(
    public generalService: GeneralService
  ) {}

  ngOnInit() {
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });}

  onOrdenChange(event: Event) {
    const valor = (event.target as HTMLSelectElement).value;
    this.ordenSeleccionado = valor;
    this.ordenCambio.emit(valor);
  }
}
