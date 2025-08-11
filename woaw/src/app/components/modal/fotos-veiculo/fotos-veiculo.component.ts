import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { GeneralService } from '../../../services/general.service';
import imageCompression from 'browser-image-compression';

@Component({
  selector: 'app-fotos-veiculo',
  templateUrl: './fotos-veiculo.component.html',
  styleUrls: ['./fotos-veiculo.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class FotosVeiculoComponent implements OnInit {
  estadoVehiculo: string = '';

  imagenPrincipal_sinFondo: File | null = null;
  imagenPrincipalMostrada: string | null = null;

  imagenesSecundarias_sinFondo: File[] = [];
  imagenesSecundariasMostradas: string[] = [];

  constructor(
    private modalController: ModalController,
    private http: HttpClient,
    private generalService: GeneralService
  ) {}

  ngOnInit() {
    // this.generalService.alert('Estado recibido', this.estadoVehiculo, 'info');
  }

  cancelar() {
    this.modalController.dismiss();
  }

  async seleccionarImagenPrincipal(event: Event) {
    const input = event.target as HTMLInputElement;
    const file: File | null = input.files?.[0] || null;

    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    const extension = file.name.split('.').pop()?.toLowerCase();
    const heicExtensions = ['heic', 'heif'];

    if (file.size > maxSize) {
      this.generalService.alert(
        'Imagen demasiado grande',
        'Máx. 10 MB',
        'warning'
      );
      return;
    }

    if (extension && heicExtensions.includes(extension)) {
      this.generalService.alert(
        'Formato no compatible',
        'Usa JPG, PNG o JPEG',
        'warning'
      );
      return;
    }

    try {
      if (!file.type.startsWith('image/')) {
        this.generalService.alert(
          'Archivo inválido',
          'Selecciona una imagen',
          'info'
        );
        return;
      }

      const comprimido = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });

      this.imagenPrincipal_sinFondo = comprimido;
      this.imagenPrincipalMostrada = URL.createObjectURL(comprimido);
    } catch (error) {
      this.generalService.alert(
        'Error',
        `No se pudo procesar la imagen: ${(error as Error)?.message || error}`,
        'danger'
      );
    }
  }

  async seleccionarImagenesSecundarias(event: Event) {
    const input = event.target as HTMLInputElement;
    const files: FileList | null = input.files;

    if (!files || files.length === 0) return;

    if (files.length + this.imagenesSecundarias_sinFondo.length > 10) {
      this.generalService.alert(
        'Límite excedido',
        'Máximo 10 imágenes secundarias',
        'warning'
      );
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const extension = file.name.split('.').pop()?.toLowerCase();
      const heicExtensions = ['heic', 'heif'];

      if (
        file.size > 10 * 1024 * 1024 ||
        (extension && heicExtensions.includes(extension))
      ) {
        this.generalService.alert(
          'Imagen no válida',
          'Debe pesar menos de 10 MB y no ser HEIC',
          'warning'
        );
        continue;
      }

      try {
        const comprimido = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });

        this.imagenesSecundarias_sinFondo.push(comprimido);
        this.imagenesSecundariasMostradas.push(URL.createObjectURL(comprimido));
      } catch (error) {
        this.generalService.alert(
          'Error',
          'Una imagen no pudo ser procesada',
          'danger'
        );
      }
    }
  }

  confirmar() {
    // Validaciones
    if (!this.imagenPrincipal_sinFondo) {
      this.generalService.alert(
        'Falta imagen principal',
        'Selecciona una imagen principal',
        'warning'
      );
      return;
    }

    if (
      this.estadoVehiculo !== 'Nuevo' &&
      this.imagenesSecundarias_sinFondo.length < 2
    ) {
      this.generalService.alert(
        'Imágenes insuficientes',
        'Debes agregar al menos 2 imágenes secundarias',
        'warning'
      );
      return;
    }

    // Si todo bien, cerrar el modal y enviar las imágenes
    this.modalController.dismiss({
      imagenPrincipal: this.imagenPrincipal_sinFondo,
      imagenesSecundarias: this.imagenesSecundarias_sinFondo,
    });
  }

  eliminarImagenSecundaria(index: number) {
    this.imagenesSecundariasMostradas.splice(index, 1);
    this.imagenesSecundarias_sinFondo.splice(index, 1);
  }

  eliminarImagenPrincipal() {
    this.imagenPrincipalMostrada = null;
    this.imagenPrincipal_sinFondo = null;
  }
}
