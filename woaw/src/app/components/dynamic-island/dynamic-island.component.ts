import { Component, OnInit, OnChanges, Input, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-dynamic-island',
  templateUrl: './dynamic-island.component.html',
  styleUrls: ['./dynamic-island.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, HttpClientModule],
})
export class DynamicIslandComponent implements OnInit, OnChanges {
  @Input() refreshKey = 0;

  cards = [
    { nombre: 'Cotización', estatus: false, icon: 'calculator-outline' },
    { nombre: 'Mis Datos', estatus: false, icon: 'person-outline' },
    { nombre: 'Póliza', estatus: false, icon: 'document-text-outline' }
  ];

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.updateFromStorage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshKey']) {
      this.updateFromStorage();
    }
  }

  private updateFromStorage(): void {
    const cotizacionRaw = localStorage.getItem('cotizacion');
    const datosUsuarioRespuesta = localStorage.getItem('UsuarioRespuesta');
    const datosPoliza = localStorage.getItem('datosPolizaVin_Respuesta');

    const cotizacionExiste =
      cotizacionRaw !== null && cotizacionRaw !== '' && cotizacionRaw !== 'null' && cotizacionRaw !== 'undefined';

    const datosUsuariosRespuesta =
      datosUsuarioRespuesta !== null && datosUsuarioRespuesta !== '' &&
      datosUsuarioRespuesta !== 'null' && datosUsuarioRespuesta !== 'undefined';

    const datosPolizaRespuesta =
      datosPoliza !== null && datosPoliza !== '' && datosPoliza !== 'null' && datosPoliza !== 'undefined';

    this.setEstatus('Cotización', cotizacionExiste);
    this.setEstatus('Mis Datos', datosUsuariosRespuesta);
    this.setEstatus('Póliza', datosPolizaRespuesta);

    this.cdr.markForCheck?.();
  }

  private setEstatus(nombre: string, estatus: boolean): void {
    const i = this.cards.findIndex(c => c.nombre === nombre);
    if (i !== -1) this.cards[i].estatus = estatus;
  }
}