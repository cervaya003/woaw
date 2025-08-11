import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ImagenesVehiculoComponent } from './../../components/modal/imagenes-vehiculo/imagenes-vehiculo.component';

@Component({
  selector: 'app-collage-ficha',
  templateUrl: './collage-ficha.component.html',
  styleUrls: ['./collage-ficha.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class CollageFichaComponent implements OnInit {
  @Input() imagenes: string[] = [];

  cartasFijas: number[] = [];
  cargadas: boolean[] = [];
  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    this.cartasFijas = Array.from(
      { length: this.imagenes.length },
      (_, i) => i
    );
    this.cargadas = this.imagenes.map(() => false);
  }
  imagenCargada(index: number) {
    this.cargadas[index] = true;
  }
  async abrirModalImagen(imagenes: string[], indice: number = 0) {
    console.log(imagenes, indice);
    const modal = await this.modalCtrl.create({
      component: ImagenesVehiculoComponent,
      componentProps: {
        imagenes,
        indice,
      },
      cssClass: 'modal-imagen-personalizado',
      backdropDismiss: true,
      showBackdrop: true,
    });

    await modal.present();
  }
}
