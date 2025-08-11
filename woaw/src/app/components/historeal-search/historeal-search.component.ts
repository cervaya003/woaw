import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { PopoverController } from '@ionic/angular';

@Component({
  selector: 'app-historeal-search',
  templateUrl: './historeal-search.component.html',
  styleUrls: ['./historeal-search.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class HistorealSearchComponent implements OnInit {
  
  historialCompleto: string[] = [];
  historialFiltrado: string[] = [];

  constructor(private popoverCtrl: PopoverController) {}

  ngOnInit() {
    const guardado = localStorage.getItem('historialBusqueda');
    this.historialCompleto = guardado ? JSON.parse(guardado) : [];

    this.historialFiltrado = this.historialCompleto.slice(0, 5);
  }

  seleccionar(sugerencia: string) {
    this.dismiss(sugerencia);
  }

  dismiss(data?: any) {
    this.popoverCtrl.dismiss(data);
  }
}
