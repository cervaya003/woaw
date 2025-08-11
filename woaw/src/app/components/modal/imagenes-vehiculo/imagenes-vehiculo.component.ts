import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-imagenes-vehiculo',
  templateUrl: './imagenes-vehiculo.component.html',
  styleUrls: ['./imagenes-vehiculo.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class ImagenesVehiculoComponent implements OnInit {
  @Input() imagenes: string[] = [];
  @Input() indice: number = 0;
  actual: string = '';
  touchStartX: number = 0;

  esVertical: boolean = true;
  anguloRotacion: number = 0;
  estilosImagenRotada: any = {};

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    this.actual = this.imagenes[this.indice] || '';
    this.analizarProporcion(this.actual);
  }
  siguiente() {
    if (this.indice < this.imagenes.length - 1) {
      this.indice++;
      this.actual = this.imagenes[this.indice];
      this.anguloRotacion = 0;
      this.analizarProporcion(this.actual);
    }
  }
  anterior() {
    if (this.indice > 0) {
      this.indice--;
      this.actual = this.imagenes[this.indice];
      this.anguloRotacion = 0;
      this.analizarProporcion(this.actual);
    }
  }
  cerrar() {
    this.modalCtrl.dismiss();
  }
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].clientX;
  }
  onTouchEnd(event: TouchEvent) {
    const touchEndX = event.changedTouches[0].clientX;
    const diffX = this.touchStartX - touchEndX;

    if (Math.abs(diffX) > 50) {
      if (diffX > 0) {
        this.siguiente();
      } else {
        this.anterior();
      }
    }
  }
  rotarImagen(event: Event) {
    event.stopPropagation();
    this.anguloRotacion = (this.anguloRotacion + 90) % 360;
    this.aplicarEstilosRotacion();
  }
  aplicarEstilosRotacion() {
    const rotacion = this.anguloRotacion;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const scaleFactor =
      rotacion % 180 === 0
        ? Math.min(vw / vw, vh / vh)
        : Math.min(vw / vh, vh / vw);

    this.estilosImagenRotada = {
      transform: `rotate(${rotacion}deg) scale(${scaleFactor})`,
      transition: 'transform 0.4s ease',
      'transform-origin': 'center center',
      'max-width': '100%',
      'max-height': '100%',
      'object-fit': 'contain',
      display: 'block',
      margin: 'auto',
    };
  }
  analizarProporcion(imgSrc: string) {
    const img = new Image();
    img.onload = () => {
      this.esVertical = img.height > img.width;
      this.aplicarEstilosRotacion();
    };
    img.src = imgSrc;
  }
}
