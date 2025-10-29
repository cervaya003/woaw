import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  NgZone,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, IonSearchbar } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { GeneralService } from '../../../services/general.service';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MapaComponent implements OnInit, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @ViewChild('inputDireccion', { static: false }) inputDireccion!: IonSearchbar;

  direccionCompleta = 'Selecciona la ubicación';
  textoBoton = '...';

  lat = 0;
  lng = 0;
  latLugar = 0;
  lngLugar = 0;

  direccion = '';
  direccionLugar = '';
  mostrarBotonLimpiar = false;
  ubicacionLugarInvalida = false;
  ubicacionLugar: [string, string, number, number] = ['', '', 0, 0];

  map!: google.maps.Map;
  markerActual: google.maps.Marker | google.maps.Circle | null = null;
  markerLugar!: google.maps.Marker;
  cargandoMapa = true;

  constructor(
    private modalController: ModalController,
    private http: HttpClient,
    private generalService: GeneralService,
    private zone: NgZone
  ) { }

  ngOnInit() { }

  async ngAfterViewInit() {
    await this.obtenerUbicacion();
  }

  /** 🔹 Forzar render del mapa cuando la modal termina de abrirse */
  ionViewDidEnter() {
    setTimeout(() => {
      if (this.map) {
        google.maps.event.trigger(this.map, 'resize');
        const center = this.map.getCenter();
        if (center) this.map.setCenter(center);
      }
    }, 400);
  }

  /** 📍 Obtener ubicación actual del usuario */
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

  /** 🗺️ Crear el mapa inicial */
  obtenerDireccion() {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${this.lat},${this.lng}&key=${environment.maps_key}`;

    this.http.get(url).subscribe((res: any) => {
      if (res.status === 'OK' && res.results.length > 0) {
        this.direccion = res.results[0].formatted_address;

        const center: google.maps.LatLngLiteral = { lat: this.lat, lng: this.lng };

        this.map = new google.maps.Map(this.mapContainer.nativeElement, {
          center,
          zoom: 15,
          draggableCursor: 'pointer',
          draggingCursor: 'grabbing',
          streetViewControl: false,
          mapTypeControl: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'all',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        // Dibuja el círculo verde actual
        if (this.markerActual) {
          this.markerActual.setMap(null);
          this.markerActual = null;
        }

        this.markerActual = new google.maps.Circle({
          map: this.map,
          center,
          radius: 50,
          fillColor: '#15ff00ff',
          fillOpacity: 0.45,
          strokeColor: '#086304ff',
          strokeOpacity: 0.9,
          strokeWeight: 2,
          clickable: false,
        });

        this.cargandoMapa = false;
        this.configurarClickEnMapa();
      }
    });
  }

  /** 🔍 Configurar buscador con Autocomplete */
  async searchMap() {
    const inputEl = await this.inputDireccion.getInputElement();
    const autocomplete = new google.maps.places.Autocomplete(inputEl, {
      types: ['geocode'],
      componentRestrictions: { country: 'mx' },
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) return;

      const loc = place.geometry.location;
      const lat = loc.lat();
      const lng = loc.lng();

      this.zone.run(() => {
        this.textoBoton = '...';
        this.direccionCompleta = 'cargando...';
        this.ubicacionLugarInvalida = false;
      });

      this.obtenerDireccionDelLugar(lat, lng, loc);
    });
  }

  /** 📦 Obtener dirección al seleccionar punto en mapa o Autocomplete */
  obtenerDireccionDelLugar(lat: number, lng: number, location: any) {
    this.zone.run(() => {
      this.textoBoton = '...';
      this.direccionCompleta = 'cargando...';
      this.ubicacionLugarInvalida = false;
    });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${environment.maps_key}`;
    this.http.get(url).subscribe((res: any) => {
      if (res.status === 'OK' && res.results.length > 0) {
        const components = res.results[0].address_components;
        let ciudad = '', estado = '';
        for (const comp of components) {
          if (comp.types.includes('locality')) ciudad = comp.long_name;
          else if (!ciudad && comp.types.includes('sublocality')) ciudad = comp.long_name;
          else if (!ciudad && comp.types.includes('administrative_area_level_2')) ciudad = comp.long_name;
          if (comp.types.includes('administrative_area_level_1')) estado = comp.long_name;
        }

        this.generalService.obtenerDireccionDesdeCoordenadas(lat, lng)
          .then((direccion) => {
            this.zone.run(() => {
              this.direccionCompleta = direccion || res.results[0].formatted_address || `${ciudad}, ${estado}`;
              this.ubicacionLugar = [ciudad, estado, lat, lng];
              this.ubicacionLugarInvalida = true;
              this.textoBoton = 'Guardar';
            });
          })
          .catch(() => {
            this.zone.run(() => {
              this.ubicacionLugarInvalida = false;
              this.direccionCompleta = 'No se pudo obtener la dirección.';
              this.textoBoton = 'Error';
            });
          });
      } else {
        this.zone.run(() => {
          this.direccionCompleta = 'No se pudo obtener la dirección.';
          this.textoBoton = 'Error';
          this.ubicacionLugarInvalida = false;
        });
      }
    });

    // Centrar mapa y marcar punto
    this.map.setCenter(location);
    if (this.markerLugar) this.markerLugar.setMap(null);
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
    if (this.markerLugar) this.markerLugar.setMap(null);
    this.ubicacionLugar = ['', '', 0, 0];
    this.ubicacionLugarInvalida = false;
    this.direccionCompleta = 'Selecciona la ubicación';
    if (this.inputDireccion) this.inputDireccion.value = '';
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
    this.modalController.dismiss(null, 'cancel');
  }
}
