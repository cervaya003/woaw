import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RegistroService } from '../../services/registro.service';
import { GeneralService } from '../../services/general.service';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { CarsService } from '../../services/cars.service';
import { ContactosService } from './../../services/contactos.service';
import { ImagenesVehiculoComponent } from './../../components/modal/imagenes-vehiculo/imagenes-vehiculo.component';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-cartas',
  templateUrl: './cartas.component.html',
  styleUrls: ['./cartas.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class CartasComponent implements OnInit {
  @Input() auto: any;
  @Input() autosFavoritosIds: Set<string> = new Set();
  @Input() ubicacion: string = '';
  @Input() esMio: boolean = false;
  @Output() refrescarAutos = new EventEmitter<string>();

  autosFavoritos: any[] = [];
  public mostrarPendientes: boolean = false;
  public MyRole: string | null = null;
  public isLoggedIn: boolean = false;

  imagenCargada = false;
  verificadorCarga: any;

  constructor(
    public generalService: GeneralService,
    private router: Router,
    public carsService: CarsService,
    public contactosService: ContactosService,
    private modalCtrl: ModalController,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    this.generalService.tipoRol$.subscribe((rol) => {
      this.MyRole = rol;
    });
    const storage = localStorage.getItem('user');
    if (storage) {
      const usuario = JSON.parse(storage);
      this.mostrarPendientes = usuario.email === 'glenditaa.003@gmail.com';
    }

    this.verificadorCarga = setInterval(() => {
      const img = new Image();
      img.src = this.auto?.imagenes?.[0];

      if (img.complete && img.naturalHeight !== 0) {
        this.imagenCargada = true;
        clearInterval(this.verificadorCarga);
      }
    }, 200);
  }
  onImagenCargada() {
    this.imagenCargada = true;
    clearInterval(this.verificadorCarga);
  }
  ficha(auto: any) {
    const urlActual = this.router.url;
    const esDesdeBusqueda = /^\/search\/vehiculos\/[^\/]+$/.test(urlActual);
    localStorage.setItem('origenFicha', String(esDesdeBusqueda));

    if (auto.vehiculo === 'auto') {
      this.router.navigate(['/ficha', 'autos', auto._id]);
    } else if (auto.vehiculo === 'moto') {
      this.router.navigate(['/ficha', 'motos', auto._id]);
    } else {
      console.warn('Tipo de vehículo no reconocido:', auto.vehiculo);
    }
  }

  async agregarAFavoritos(vehicleId: string) {
    if (!this.isLoggedIn) {
      this.router.navigate(['/inicio']);
      this.generalService.alert(
        'Inicia sesión',
        'Debes iniciar sesión para poder agregar este vehículo a tus favoritos.',
        'info'
      );
      return;
    }

    // Mostrar spinner
    await this.generalService.loading('Cargando...');

    this.carsService.agregarFavorito(vehicleId).subscribe({
      next: async () => {
        this.refrescarAutos.emit(this.ubicacion);
        await this.generalService.loadingDismiss();
      },
      error: async (err) => {
        await this.generalService.loadingDismiss();
        const mensaje =
          err.error?.message ||
          'No se pudo agregar el auto a favoritos. Intenta más tarde.';
        await this.generalService.alert('Error', mensaje, 'danger');
      },
    });
  }
  toggleEstado(auto: any, event: Event) {
    event.stopPropagation(); // Evita que se dispare el evento de clic en el auto
    this.carsService.toggleEstadoVehiculo(auto._id).subscribe({
      next: (res: any) => {
        // Actualiza visualmente el estado del auto
        auto.estadoVehiculo =
          auto.estadoVehiculo === 'disponible' ? 'vendido' : 'disponible';

        this.generalService.alert(
          'Estado actualizado',
          `Estado cambiado a "${auto.estadoVehiculo.toUpperCase()}".`,
          'success'
        );
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Error al cambiar el estado.';
      },
    });
  }
  eliminarDeFavoritos(autoId: string) {
    this.carsService.eliminarFavorito(autoId).subscribe({
      next: () => {
        this.autosFavoritos = this.autosFavoritos.filter(
          (auto) => auto._id !== autoId
        );
        // this.actualizarPaginacion();
        // this.getCarsFavoritos();
        this.refrescarAutos.emit(this.ubicacion);
      },
      error: (err) => {
        // this.getCarsFavoritos();
        const mensaje = err?.error?.message || 'No se pudo eliminar';
        // this.generalService.alert('Error', mensaje, 'danger');
      },
      complete: () => {
        // this.getCarsFavoritos();
        this.generalService.loadingDismiss();
      },
    });
  }
  update_car(auto: any, tipo: string) {
    // console.log(auto._id)
    if (this.ubicacion === 'mis_motos') {
      this.router.navigate(['/update-car', 'motos', auto._id]);
    } else {
      this.router.navigate(['/update-car', 'autos', auto._id]);
    }
  }
  onCardClick(auto: any, event: Event): void {
    event.stopPropagation();
    if (this.ubicacion === 'mis_autos' || this.ubicacion === 'mis_motos') {
      this.update_car(auto, this.ubicacion);
    } else {
      this.ficha(auto);
    }
  }
  async abrirModalImagen(imagenes: string[], indice: number = 0) {
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
  obtenerPrecioMinimo(versiones: { Precio: number }[]): number {
    return Math.min(...versiones.map((v) => v.Precio));
  }
}
