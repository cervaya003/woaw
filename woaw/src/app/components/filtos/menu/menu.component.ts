import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CarsService } from './../../../services/cars.service';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [CommonModule, IonicModule, ReactiveFormsModule, HttpClientModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class MenuComponent implements OnInit {
  @Input() filtros: any[] = [];
  @Input() filtrosAplicados: any = {};
  @Output() mostrarOpciones = new EventEmitter<{
    event: Event;
    tipo: string;
  }>();

  @Output() limpiarFiltros = new EventEmitter<void>();

  constructor() {}

  ngOnInit() {}

  onFiltroClick(event: Event, tipo: string) {
    this.mostrarOpciones.emit({ event, tipo });
  }

  obtenerColorHex(nombre: string): string {
    const colores: { [key: string]: string } = {
      Blanco: '#FFFFFF',
      Negro: '#000000',
      Gris: '#808080',
      'Gris Oxford': '#4B4B4B',
      Plateado: '#C0C0C0',
      Rojo: '#FF0000',
      Azul: '#0000FF',
      'Azul marino': '#000080',
      'Azul cielo': '#87CEEB',
      Verde: '#008000',
      'Verde oscuro': '#006400',
      Beige: '#F5F5DC',
      Café: '#8B4513',
      Amarillo: '#FFFF00',
      Naranja: '#FFA500',
      Morado: '#800080',
      Vino: '#800000',
      Oro: '#FFD700',
      Bronce: '#CD7F32',
      Turquesa: '#40E0D0',
      Arena: '#D6A77A',
      Grafito: '#3B3B3B',
      Champagne: '#F7E7CE',
      Titanio: '#8C8C8C',
      Cobre: '#B87333',
      Camaleón: '#7FFF00',
      Otro: '#999999',
    };
    return colores[nombre] || '#cccccc';
  }

  onLimpiarFiltros() {
    this.limpiarFiltros.emit();
  }

  tieneFiltrosAplicados(): boolean {
    if (!this.filtrosAplicados || typeof this.filtrosAplicados !== 'object') {
      return false;
    }

    return Object.values(this.filtrosAplicados).some((valor) => !!valor);
  }
}
