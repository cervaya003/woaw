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

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class MapaComponent implements OnInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  lat: number = 0;
  lng: number = 0;
  latLugar: number = 0;
  lngLugar: number = 0;

  direccion: string = '';
  direccionLugar: string = '';
  mostrarBotonLimpiar: boolean = false;
  ubicacionLugarInvalida: boolean = false;
  ubicacionLugar: [string, string, number, number] = ['', '', 0, 0];

  map!: google.maps.Map;
  markerActual!: google.maps.Marker;
  markerLugar!: google.maps.Marker;

  @ViewChild('inputDireccion', { static: false }) inputDireccion: any;

  cargandoMapa: boolean = true;

  constructor(
    private modalController: ModalController,
    private http: HttpClient,
    private generalService: GeneralService
  ) {}

  ngOnInit() {}

  async ngAfterViewInit() {
    await this.obtenerUbicacion();
  }

  async obtenerUbicacion() {
    try {
      const position = await Geolocation.getCurrentPosition();

      this.lat = position.coords.latitude;
      this.lng = position.coords.longitude;

      this.obtenerDireccion();
      this.searchMap();
    } catch (error: any) {
      console.warn('Error al obtener ubicación:', error.message);
      this.generalService.alert(
        'No se pudo obtener tu ubicación',
        'Verifica que los permisos de ubicación estén habilitados y que tengas conexión a internet. También puedes seleccionar manualmente un punto en el mapa.',
        'warning'
      );
    }
  }

  obtenerDireccion() {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${this.lat},${this.lng}&key=${environment.maps_key}`;

    this.http.get(url).subscribe((res: any) => {
      if (res.status === 'OK' && res.results.length > 0) {
        this.direccion = res.results[0].formatted_address;

        const center = new google.maps.LatLng(this.lat, this.lng);
        this.map = new google.maps.Map(this.mapContainer.nativeElement, {
          center,
          zoom: 15,
        });

        this.markerActual = new google.maps.Marker({
          map: this.map,
          position: center,
          icon: {
            url: 'https://maps.gstatic.com/mapfiles/ms2/micons/man.png',
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 40),
          },
        });
        setTimeout(() => {
          this.cargandoMapa = false;
        }, 1000);
        this.configurarClickEnMapa();
      }
    });
  }

  searchMap() {
    const input = document.querySelector(
      'ion-input[placeholder="Buscar dirección, colonia o lugar..."] input'
    ) as HTMLInputElement;

    if (!input) return;

    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['geocode'],
      componentRestrictions: { country: 'mx' },
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      if (!place.geometry || !place.geometry.location) return;

      const location = place.geometry.location;
      this.latLugar = location.lat();
      this.lngLugar = location.lng();
      this.obtenerDireccionDelLugar(this.latLugar, this.lngLugar, location);
    });
  }

  obtenerDireccionDelLugar(lat: number, lng: number, location: any) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${environment.maps_key}`;

    this.http.get(url).subscribe((res: any) => {
      if (res.status === 'OK' && res.results.length > 0) {
        const components = res.results[0].address_components;
        let ciudad = '',
          estado = '';

        for (let comp of components) {
          if (comp.types.includes('locality')) ciudad = comp.long_name;
          else if (!ciudad && comp.types.includes('sublocality'))
            ciudad = comp.long_name;
          else if (
            !ciudad &&
            comp.types.includes('administrative_area_level_2')
          )
            ciudad = comp.long_name;

          if (comp.types.includes('administrative_area_level_1'))
            estado = comp.long_name;
        }

        this.ubicacionLugar = [ciudad, estado, lat, lng];
        this.ubicacionLugarInvalida = true;
      } else {
        this.direccionLugar = 'No se pudo obtener la dirección del lugar.';
      }
    });

    this.map.setCenter(location);

    if (this.markerLugar) {
      this.markerLugar.setMap(null);
    }

    this.markerLugar = new google.maps.Marker({
      map: this.map,
      position: location,
      icon: {
        url: 'https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png',
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 40),
      },
    });
  }

  configurarClickEnMapa() {
    this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;

      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      this.limpiarInputDireccion();
      this.obtenerDireccionDelLugar(lat, lng, event.latLng);
    });
  }

  onInputChange(event: any): void {
    const valor = event.detail?.value || '';
    this.mostrarBotonLimpiar = valor.length > 0;
  }

  limpiarInputDireccion(): void {
    if (this.markerLugar) {
      this.markerLugar.setMap(null);
    }

    this.ubicacionLugar = ['', '', 0, 0];
    this.inputDireccion.value = '';
    this.mostrarBotonLimpiar = false;
  }

  confirmarUbicacion() {
    if (this.ubicacionLugarInvalida) {
      this.modalController.dismiss(this.ubicacionLugar);
    } else {
      this.generalService.alert(
        'Ubicación no válida',
        'Por favor, selecciona una ubicación válida en el mapa antes de continuar.',
        'warning'
      );
    }
  }

  cancelar() {
    this.modalController.dismiss();
  }
}
