import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GeneralService } from '../../../services/general.service';
import { ModalController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { CarsService } from '../../../services/cars.service';
import { MotosService } from '../../../services/motos.service';
import imageCompression from 'browser-image-compression';
import { RegistroService } from '../../../services/registro.service';
import { MapaComponent } from '../../../components/modal/mapa/mapa.component';

import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-update-car',
  templateUrl: './update-car.page.html',
  styleUrls: ['./update-car.page.scss'],
  standalone: false,
})
export class UpdateCarPage implements OnInit {
  auto: any = null;

  urlsImagenes: string[] = [];
  imagenes: File[] = [];
  urlsImagenesExistentes: string[] = [];
  precioMoto: number | null = null;

  esDispositivoMovil: boolean = false;
  descripcionExpandida: boolean = false;
  ActualizaImgen: boolean = false;
  ubicacionSeleccionada: [string, string, number, number] | null = null;

  versionSeleccionada: { nombre: string; precio: number } | null = null;
  versiones: { nombre: string; precio: number }[] = [];
  especificacionesAuto: any[] = [];
  public isLoggedIn: boolean = false;
  public MyRole: string | null = null;
  tipo: string = '';
  @ViewChild('mapAutoContainer', { static: false }) mapAutoContainer!: ElementRef;
  mapAuto!: google.maps.Map;
  autoMarker!: google.maps.Marker;
  direccionCompleta: string = 'Obteniendo ubicación...';
  public tipo_veiculo: string = '';

  ubicacionesLoteLegibles: string[] = [];

  imagenPrincipal_sinFondo: File | string | null = null;
  imagenPrincipalMostrada: string = '';

  // opciones de color para el ion-select
  opciones = [
    { label: 'Blanco' }, { label: 'Negro' }, { label: 'Gris' }, { label: 'Plateado' },
    { label: 'Rojo' }, { label: 'Azul' }, { label: 'Azul marino' }, { label: 'Verde' },
    { label: 'Verde oscuro' }, { label: 'Beige' }, { label: 'Café' }, { label: 'Amarillo' },
    { label: 'Naranja' }, { label: 'Morado' }, { label: 'Vino' }, { label: 'Oro' },
    { label: 'Bronce' }, { label: 'Turquesa' }, { label: 'Gris Oxford' }, { label: 'Arena' },
    { label: 'Azul cielo' }, { label: 'Grafito' }, { label: 'Champagne' }, { label: 'Titanio' },
    { label: 'Cobre' }, { label: 'Camaleón' }, { label: 'Otro' },
  ];

  restablecer: boolean = false;
  versionesOriginales: any[] = [];
  lotes: any[] = [];
  totalLotes: number = 0;
  loteSeleccionado: string | null = null;
  direccionSeleccionada: any = null;
  direccionSeleccionadaActual: any = null;
  ubicacionesLoteSeleccionado: any[] = [];
  tipoSeleccionado: 'particular' | 'lote' = 'particular';
  @ViewChild('inputArchivo', { static: false }) inputArchivo!: ElementRef;

  // 🔒 Control de inicialización y snapshot
  private initializing = true;
  private initialComparable: any = null;

  constructor(
    private route: ActivatedRoute,
    private modalController: ModalController,
    private generalService: GeneralService,
    private http: HttpClient,
    private router: Router,
    public carsService: CarsService,
    public motosService: MotosService,
    private registroService: RegistroService,
  ) { }

  // === Nuevo: helper para saber si el vehículo es "nuevo"
  get isNuevo(): boolean {
    return (this.auto?.tipoVenta || '').toLowerCase() === 'nuevo';
  }

  async ngOnInit() {
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });

    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });

    const rolDefinido = await firstValueFrom(
      this.generalService.tipoRol$.pipe(filter((rol) => rol !== undefined))
    );
    this.MyRole = (rolDefinido ?? null) as any;

    await this.obtenerVeiculo();

    if (this.MyRole === 'admin') {
      this.getLotes('all');
    } else if (this.MyRole === 'lotero') {
      this.getLotes('mios');
    } else {
      this.tryFinalizeInit();
    }
  }

  // =========================
  // Helpers de tracking cambios
  // =========================
  private normColor(value: any): string {
    if (Array.isArray(value)) return value.join(', ');
    return (value ?? '').toString();
  }

  private buildComparableState() {
    const ubicSel = this.ubicacionSeleccionada
      ? { lat: this.ubicacionSeleccionada[2], lng: this.ubicacionSeleccionada[3] }
      : null;

    const dirSel = this.direccionSeleccionada
      ? {
        lat: Number(this.direccionSeleccionada.lat ?? 0),
        lng: Number(this.direccionSeleccionada.lng ?? 0),
      }
      : null;

    const motoExtras = this.tipo_veiculo === 'motos'
      ? {
        tipoMotor: String(this.auto?.tipoMotor ?? ''),
        cilindrada: String(this.auto?.cilindrada ?? ''),
        transmision: String(this.auto?.transmision ?? ''),
        combustible: String(this.auto?.combustible ?? ''),
        frenos: String(this.auto?.frenos ?? ''),
        suspension: String(this.auto?.suspension ?? ''),
        precioMoto: Number(this.precioMoto ?? 0),
      }
      : {
        tipoMotor: '',
        cilindrada: '',
        transmision: '',
        combustible: '',
        frenos: '',
        suspension: '',
        precioMoto: null,
      };

    return {
      tipo: this.tipo_veiculo,
      tipoSeleccionado: this.tipoSeleccionado,
      loteSeleccionado: this.loteSeleccionado ?? null,
      direccionSeleccionada: dirSel,
      ubicacionSeleccionada: ubicSel,

      // Campos base
      kilometraje: this.auto?.kilometraje ?? null,
      color: this.normColor(this.auto?.color),
      moneda: this.auto?.moneda ?? null,
      placas: (this.auto?.placas && this.auto.placas !== 'null') ? this.auto.placas : '',
      descripcion: this.auto?.descripcion ?? '',

      // Imágenes
      imagenPrincipalMostrada: this.imagenPrincipalMostrada ?? null,
      imagenes: (this.urlsImagenes || []).slice().sort(),

      // Versiones/precio
      versiones: this.tipo_veiculo === 'autos'
        ? (this.auto?.version || []).map((v: any) => ({ Name: v.Name, Precio: Number(v.Precio) }))
        : null,

      ...motoExtras,
    };
  }

  private actualizarFlagCambios() {
    const curr = this.buildComparableState();
    this.restablecer = JSON.stringify(curr) !== JSON.stringify(this.initialComparable);
  }

  private markDirtyFromUI() {
    if (this.initializing) return; // ignora cambios durante init
    this.actualizarFlagCambios();
  }

  private tryFinalizeInit() {
    if (!this.initializing) return;
    if (!this.auto) return;
    this.initialComparable = this.buildComparableState();
    this.restablecer = false;
    this.initializing = false;
  }

  // =========================

  async obtenerVeiculo() {
    this.tipo_veiculo = this.route.snapshot.paramMap.get('tipo') ?? '';
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    if (this.tipo_veiculo === 'autos') {
      this.autosURL(id);
    } else if (this.tipo_veiculo === 'motos') {
      this.motosURL(id);
    } else if (this.tipo_veiculo === 'renta') {
      this.rentaURL(id);
    }
  }

  async autosURL(id: string) {
    this.carsService.getCar(id).subscribe({
      next: (res: any) => {
        this.auto = res;

        // 🔒 Reglas de "nuevo"
        if (this.isNuevo) {
          this.auto.kilometraje = 0;
          this.auto.placas = '';
        }

        this.imagenPrincipalMostrada = this.auto.imagenPrincipal;
        this.urlsImagenes = [...this.auto.imagenes];
        this.urlsImagenesExistentes = [...res.imagenes];
        this.versionesOriginales = JSON.parse(JSON.stringify(this.auto.version));

        if (res.lote != null) {
          this.tipoSeleccionado = 'lote';
          this.loteSeleccionado = res.lote._id;
          this.direccionSeleccionadaActual = res.ubicacion;
          this.ubicacionesLoteSeleccionado = res.lote.direccion || [];
          this.leerLatLng();
        }

        if (res.ubicacion && res.lote == null) {
          this.tipoSeleccionado = 'particular';
          this.direccionSeleccionada = res.ubicacion;
          const ubic = res.ubicacion;
          this.ubicacionSeleccionada = [
            ubic.ciudad || 'Sin ciudad',
            ubic.estado || 'Sin estado',
            ubic.lat || 0,
            ubic.lng || 0,
          ];
          this.generalService.obtenerDireccionDesdeCoordenadas(ubic.lat, ubic.lng)
            .then((direccion) => { this.direccionCompleta = direccion; })
            .catch((error) => {
              this.direccionCompleta = 'No se pudo obtener la dirección.';
              console.warn(error);
            });
        }

        this.tryFinalizeInit();
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('Error', mensaje, 'danger');
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  async motosURL(id: string) {
    this.motosService.getMoto(id).subscribe({
      next: (res: any) => {
        this.auto = res || {};
        this.precioMoto = res?.precio ?? null;

        // 🔒 Reglas de "nuevo" también para motos
        if (this.isNuevo) {
          this.auto.kilometraje = 0;
          this.auto.placas = '';
        }

        this.imagenPrincipalMostrada = this.auto?.imagenPrincipal || null;
        this.urlsImagenes = Array.isArray(this.auto?.imagenes) ? [...this.auto.imagenes] : [];
        this.urlsImagenesExistentes = Array.isArray(res?.imagenes) ? [...res.imagenes] : [];

        if (res?.lote) {
          this.tipoSeleccionado = 'lote';
          this.loteSeleccionado = res.lote._id;
          this.ubicacionesLoteSeleccionado = Array.isArray(res.lote?.direccion) ? res.lote.direccion : [];
          this.direccionSeleccionadaActual = res.ubicacion || null;

          if (res.ubicacion && this.ubicacionesLoteSeleccionado.length > 0) {
            const { lat, lng } = res.ubicacion;
            const match = this.ubicacionesLoteSeleccionado.find((d: any) => d.lat === lat && d.lng === lng);
            this.direccionSeleccionada = match || null;
          } else {
            this.direccionSeleccionada = null;
          }

          this.leerLatLng();
        }

        if (res?.ubicacion && !res?.lote) {
          this.tipoSeleccionado = 'particular';
          this.direccionSeleccionada = res.ubicacion;

          const { ciudad, estado, lat, lng } = res.ubicacion;
          this.ubicacionSeleccionada = [
            ciudad || 'Sin ciudad',
            estado || 'Sin estado',
            typeof lat === 'number' ? lat : 0,
            typeof lng === 'number' ? lng : 0,
          ];

          this.generalService
            .obtenerDireccionDesdeCoordenadas(this.ubicacionSeleccionada[2], this.ubicacionSeleccionada[3])
            .then((direccion) => (this.direccionCompleta = direccion))
            .catch((error) => {
              this.direccionCompleta = 'No se pudo obtener la dirección.';
              console.warn(error);
            });
        }

        this.tryFinalizeInit();
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('Error', mensaje, 'danger');
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  async rentaURL(id: string) {
    // Suponemos que es un auto en renta
    this.carsService.getCar(id).subscribe({
      next: (res: any) => {
        this.auto = res;

        // Reglas de "nuevo"
        if (this.isNuevo) {
          this.auto.kilometraje = 0;
          this.auto.placas = '';
        }

        this.imagenPrincipalMostrada = this.auto.imagenPrincipal;
        this.urlsImagenes = [...this.auto.imagenes];
        this.urlsImagenesExistentes = [...res.imagenes];
        this.versionesOriginales = JSON.parse(JSON.stringify(this.auto.version));

        if (res.lote != null) {
          this.tipoSeleccionado = 'lote';
          this.loteSeleccionado = res.lote._id;
          this.direccionSeleccionadaActual = res.ubicacion;
          this.ubicacionesLoteSeleccionado = res.lote.direccion || [];
          this.leerLatLng();
        }

        if (res.ubicacion && res.lote == null) {
          this.tipoSeleccionado = 'particular';
          this.direccionSeleccionada = res.ubicacion;
          const ubic = res.ubicacion;
          this.ubicacionSeleccionada = [
            ubic.ciudad || 'Sin ciudad',
            ubic.estado || 'Sin estado',
            ubic.lat || 0,
            ubic.lng || 0,
          ];
          this.generalService.obtenerDireccionDesdeCoordenadas(ubic.lat, ubic.lng)
            .then((direccion) => { this.direccionCompleta = direccion; })
            .catch((error) => {
              this.direccionCompleta = 'No se pudo obtener la dirección.';
              console.warn(error);
            });
        }

        this.tryFinalizeInit();
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('Error', mensaje, 'danger');
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  getEspecificacionesPorVersion(version: string) {
    const anio = this.auto.anio;
    const marca = this.auto.marca;
    const modelo = this.auto.modelo;
    const vers = version;

    this.carsService
      .EspesificacionesVersionFicha(anio, marca, modelo, vers)
      .subscribe({
        next: (res: any[]) => {
          this.generalService.loadingDismiss();
          this.especificacionesAuto = res;
        },
        error: (err) => {
          this.generalService.loadingDismiss();
          const mensaje =
            err?.error?.message ||
            'Ocurrió un error al traer las especificaciones';
          this.generalService.alert(
            'Error al obtener especificaciones',
            mensaje,
            'danger'
          );
        },
        complete: () => {
          this.generalService.loadingDismiss();
        },
      });
  }

  onSeleccionarVersion(version: { nombre: string; precio: number }) {
    this.versionSeleccionada = version;
    this.getEspecificacionesPorVersion(version.nombre);
  }

  mostrarmapa() {
    const { lat, lng, ciudad, estado } = this.auto.ubicacion;

    const position = new google.maps.LatLng(lat, lng);

    setTimeout(() => {
      this.mapAuto = new google.maps.Map(this.mapAutoContainer.nativeElement, {
        center: position,
        zoom: 15,
      });

      this.autoMarker = new google.maps.Marker({
        position,
        map: this.mapAuto,
        title: `${ciudad}, ${estado}`,
        icon: {
          url: 'assets/icon/car_red.png',
          scaledSize: new google.maps.Size(30, 30),
          anchor: new google.maps.Point(15, 30),
        },
      });
    }, 300);
    this.generalService.obtenerDireccionDesdeCoordenadas(lat, lng)
      .then((direccion) => {
        this.direccionCompleta = direccion;
      })
      .catch((error) => {
        this.direccionCompleta = 'No se pudo obtener la dirección.';
        console.warn(error);
      });
  }

  // ##----- Imagenes -----
  actualizarImagenPrincipal(nuevaImagen: string) {
    this.generalService.confirmarAccion(
      '¿Deseas usar esta imagen como imagen principal del vehículo?',
      'Establecer como principal',
      () => {
        this.selecionarUnaExistente(nuevaImagen);
      }
    );
  }
  selecionarUnaExistente(nuevaImagen: string) {
    this.imagenPrincipalMostrada = nuevaImagen;
    this.imagenPrincipal_sinFondo = nuevaImagen; // string (URL)
    this.markDirtyFromUI();
  }
  seleccionarImagen() {
    this.inputArchivo.nativeElement.click();
  }
  async cargarNuevaImagen(event: Event) {
    const input = event.target as HTMLInputElement;
    const file: File | null = input.files?.[0] || null;

    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.generalService.alert(
        'Imagen demasiado grande',
        'La imagen principal no debe exceder los 10 MB.',
        'warning'
      );
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    const heicExtensions = ['heic', 'heif'];
    if (extension && heicExtensions.includes(extension)) {
      this.generalService.alert(
        'Formato no compatible',
        'Por favor selecciona una imagen en formato JPG, PNG o similar.',
        'warning'
      );
      return;
    }

    try {
      const comprimido = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });

      const previewUrl = URL.createObjectURL(comprimido);
      this.imagenPrincipalMostrada = previewUrl;
      this.imagenPrincipal_sinFondo = comprimido; // File comprimido
      this.markDirtyFromUI();
      this.generalService.alert(
        '¡Listo!',
        'La imagen fue agregada exitosamente.',
        'success'
      );
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      this.generalService.alert(
        'Error',
        'No se pudo procesar la imagen.',
        'danger'
      );
    }
  }

  async agregarImagen(event: Event) {
    const input = event.target as HTMLInputElement;
    const file: File | null = input.files?.[0] || null;
    if (!file) return;

    if (this.urlsImagenes.length >= 10) {
      this.generalService.alert(
        'Límite alcanzado',
        'Solo puedes agregar hasta 10 imágenes.',
        'warning'
      );
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.generalService.alert(
        'Imagen demasiado grande',
        'Cada imagen no debe exceder los 10 MB.',
        'warning'
      );
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    const heicExtensions = ['heic', 'heif'];
    if (extension && heicExtensions.includes(extension)) {
      this.generalService.alert(
        'Formato no compatible',
        'Por favor selecciona una imagen en formato JPG, PNG o similar.',
        'warning'
      );
      return;
    }

    try {
      const comprimido = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });

      const previewUrl = URL.createObjectURL(comprimido);
      this.urlsImagenes.push(previewUrl);
      this.imagenes.push(comprimido); // guardamos el File comprimido
      this.markDirtyFromUI();
      this.generalService.alert(
        '¡Listo!',
        'La imagen fue agregada exitosamente.',
        'success'
      );
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      this.generalService.alert(
        'Error',
        'No se pudo procesar la imagen.',
        'danger'
      );
    }
  }

  dividirImagenes(imagenes: string[], columnas: number): string[][] {
    if (!imagenes || imagenes.length === 0) return [];

    const resultado: string[][] = [];
    for (let i = 0; i < imagenes.length; i += columnas) {
      resultado.push(imagenes.slice(i, i + columnas));
    }
    return resultado;
  }

  // ##----- -----
  async alert(id: string) {
    this.generalService.confirmarAccion(
      '¿Estás seguro de eliminar este vehículo?',
      'Eliminar',
      () => {
        if (this.tipo_veiculo === 'autos') {
          this.eliminarCoches(id);
        } else if (this.tipo_veiculo === 'motos') {
          this.eliminarMotos(id);
        }
      }
    );
  }

  eliminarCoches(id: string) {
    this.carsService.deleteCar(id).subscribe({
      next: (res: any) => {
        this.generalService.alert(
          'Éxito',
          'Vehículo eliminado correctamente.',
          'success'
        );
        this.router.navigate(['/mis-autos']);
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Error al eliminar el vehículo';
        this.generalService.alert('Error', mensaje, 'danger');
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  eliminarMotos(id: string) {
    this.motosService.deleteMoto(id).subscribe({
      next: (res: any) => {
        this.generalService.alert(
          'Éxito',
          'Motos eliminada correctamente.',
          'success'
        );
        this.router.navigate(['/mis-motos']);
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Error al eliminar el vehículo';
        this.generalService.alert('Error', mensaje, 'danger');
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  // ## ----- Actualizar auto o moto

  verificarCambiosPrecio(): void {
    this.actualizarFlagCambios();
  }

  async alertPutCar(id: string) {
    this.generalService.confirmarAccion(
      '¿Estás seguro de actualizar este vehículo?',
      'Actualizar información',
      async () => {
        await this.PutAuto(id);
      }
    );
  }

  async PutAuto(id: string) {
    await this.generalService.loading('Verificando...');

    try {
      let formData = await this.generarFormDataImagenes();

      if (this.tipo_veiculo === 'autos' || this.tipo_veiculo === 'renta') {
        formData = await this.agregarCamposBasicosAlFormData_autos(formData);
        formData = await this.agregarUbicacionAlFormData_autos(formData);
        formData = await this.agregarVersionesAlFormData_autos(formData);
        // 👉 marca qué campos van vacíos para que el backend los limpie si hace falta
        this.appendClearFields(formData, this.getCamposVaciosAutos());
        this.enviarDatos_autos(id, formData);

      } else if (this.tipo_veiculo === 'motos') {
        formData = await this.agregarPrecioAlFormData_Motos(formData);
        formData = await this.agregarCamposBasicosAlFormData_motos(formData);
        formData = await this.agregarUbicacionAlFormData_autos(formData);
        this.appendClearFields(formData, this.getCamposVaciosMotos());
        this.enviarDatos_motos(id, formData);
      }
    } catch (error) {
      this.generalService.loadingDismiss();

      let mensaje = 'Error desconocido';
      if (typeof error === 'string') {
        mensaje = error;
      } else if (typeof error === 'object' && error !== null && 'error' in error) {
        mensaje = (error as any).error;
      }
      this.generalService.alert('Error', String(mensaje), 'danger');
    }
  }

  // 🔧 Actualizado: no enviar strings como archivos y no recomprimir de nuevo
  private async generarFormDataImagenes(): Promise<FormData> {
    const formData = new FormData();

    // Imagen principal puede ser File (nueva) o string (URL existente)
    if (this.imagenPrincipal_sinFondo instanceof File) {
      formData.append('imagenPrincipal', this.imagenPrincipal_sinFondo);
      // También súbela como parte de la galería
      formData.append('imagenes', this.imagenPrincipal_sinFondo);
    } else if (typeof this.imagenPrincipal_sinFondo === 'string' && this.imagenPrincipal_sinFondo.trim()) {
      formData.append('imagenPrincipal', this.imagenPrincipal_sinFondo);
      // NO la metas a 'imagenes' si es string
    }

    // Imágenes nuevas: ya están comprimidas en agregarImagen(); no las vuelvas a comprimir
    for (const file of this.imagenes) {
      formData.append('imagenes', file);
    }

    if (this.urlsImagenesExistentes.length > 0) {
      formData.append(
        'imagenesExistentes',
        JSON.stringify(this.urlsImagenesExistentes)
      );
    }

    return formData;
  }

  private async agregarVersionesAlFormData_autos(
    formData: FormData
  ): Promise<FormData> {
    return new Promise((resolve, reject) => {
      if (!this.auto?.version?.length) {
        return resolve(formData);
      }

      const versionesValidas: any[] = [];

      for (let i = 0; i < this.auto.version.length; i++) {
        const v = this.auto.version[i];
        const precio = v.Precio;

        if (
          precio === null ||
          precio === undefined ||
          isNaN(precio) ||
          precio < 10000 ||
          precio > 10000000
        ) {
          this.generalService.alert(
            'Precio inválido',
            `El precio para la versión "${v.Name}" debe estar entre $10,000 y $10,000,000.`,
            'warning'
          );
          throw new Error('Precio inválido en versión');
        }

        versionesValidas.push({
          Name: v.Name,
          Precio: precio,
        });
      }

      formData.append('version', JSON.stringify(versionesValidas));
      resolve(formData);
    });
  }

  // ✅ AUTOS: siempre enviar campos, con reglas para "nuevo"
  private async agregarCamposBasicosAlFormData_autos(formData: FormData): Promise<FormData> {
    const km = this.isNuevo ? 0 : (this.auto?.kilometraje ?? '');
    const colorValue = this.auto?.color;
    const color =
      Array.isArray(colorValue) ? colorValue.join(', ') : (colorValue ?? '').toString();

    const moneda = (this.auto?.moneda ?? 'MXN').toString();
    const placas = this.isNuevo
      ? ''
      : ((this.auto?.placas && this.auto.placas !== 'null') ? this.auto.placas : '');
    const descripcion = (this.auto?.descripcion ?? '').toString();

    formData.append('kilometraje', String(km));
    formData.append('color', color);
    formData.append('moneda', moneda);
    formData.append('placas', placas);
    formData.append('descripcion', descripcion);

    return formData;
  }

  // ✅ MOTO: siempre enviar campos; si es nueva, km=0 y placas=''
  private async agregarCamposBasicosAlFormData_motos(formData: FormData): Promise<FormData> {
    const kmVal = this.isNuevo ? 0 : this.auto?.kilometraje;
    formData.append('kilometraje', kmVal === undefined || kmVal === null ? '' : String(kmVal));

    const colorValue = this.auto?.color;
    const color = Array.isArray(colorValue)
      ? colorValue.join(', ')
      : (colorValue ?? '').toString();
    formData.append('color', color);

    const moneda = (this.auto?.moneda ?? 'MXN').toString();
    formData.append('moneda', moneda);

    const placasVal = this.isNuevo ? '' : String(this.auto?.placas ?? '');
    formData.append('placas', placasVal);
    formData.append('descripcion', String(this.auto?.descripcion ?? ''));

    formData.append('tipoMotor', String(this.auto?.tipoMotor ?? ''));
    formData.append('cilindrada', String(this.auto?.cilindrada ?? ''));
    formData.append('transmision', String(this.auto?.transmision ?? ''));
    formData.append('combustible', String(this.auto?.combustible ?? ''));
    formData.append('frenos', String(this.auto?.frenos ?? ''));
    formData.append('suspension', String(this.auto?.suspension ?? ''));

    return formData;
  }

  private async agregarUbicacionAlFormData_autos(
    formData: FormData
  ): Promise<FormData> {
    return new Promise(async (resolve, reject) => {
      let ubicacionObj: any = null;
      const isFiniteNum = (n: any) => typeof n === 'number' && Number.isFinite(n);

      if (this.tipoSeleccionado === 'particular' && this.ubicacionSeleccionada) {
        const [ciudad, estado, lat, lng] = this.ubicacionSeleccionada;

        if (!ciudad || !estado || !isFiniteNum(lat) || !isFiniteNum(lng)) {
          await this.generalService.alert(
            'Ubicación incompleta',
            'Debes seleccionar una ciudad, estado y coordenadas válidas.',
            'warning'
          );
          return reject('Ubicación inválida');
        }

        ubicacionObj = { ciudad, estado, lat, lng };
        formData.append('ubicacion', JSON.stringify(ubicacionObj));
        formData.append('lote', '');
        return resolve(formData);

      } else if (this.tipoSeleccionado === 'lote') {
        const lote = this.lotes.find(l => l._id === this.loteSeleccionado);

        if (!lote) {
          await this.generalService.alert(
            'Lote no encontrado',
            'Debes seleccionar un lote válido.',
            'warning'
          );
          return reject('Lote no válido');
        }

        const direccion =
          lote.direccion.length > 1
            ? this.direccionSeleccionada
            : lote.direccion[0];

        if (!direccion || !direccion.ciudad || !direccion.estado || !isFiniteNum(direccion.lat) || !isFiniteNum(direccion.lng)) {
          await this.generalService.alert(
            'Dirección inválida',
            'Debes seleccionar una ubicación válida del lote.',
            'warning'
          );
          return reject('Dirección de lote inválida');
        }

        ubicacionObj = {
          ciudad: direccion.ciudad,
          estado: direccion.estado,
          lat: direccion.lat,
          lng: direccion.lng,
        };

        formData.append('lote', lote._id);
        formData.append('ubicacion', JSON.stringify(ubicacionObj));
        return resolve(formData);
      }

      return reject('Sin ubicación válida');
    });
  }

  private async agregarPrecioAlFormData_Motos(
    formData: FormData
  ): Promise<FormData> {
    return new Promise((resolve, reject) => {
      if (
        this.precioMoto === null ||
        this.precioMoto === undefined ||
        isNaN(this.precioMoto as any) ||
        this.precioMoto < 10000 ||
        this.precioMoto > 10000000
      ) {
        this.generalService.alert(
          'Precio inválido',
          'El precio debe estar entre $10,000 y $10,000,000.',
          'warning'
        );
        return reject(new Error('Precio inválido en moto'));
      }

      formData.append('precio', String(this.precioMoto));
      resolve(formData);
    });
  }

  // 👉 helper para pasar al backend qué campos vaciar
  private appendClearFields(formData: FormData, fields: string[]) {
    if (fields && fields.length) {
      formData.append('clearFields', JSON.stringify(fields));
    }
  }

  private getCamposVaciosAutos(): string[] {
    const clears: string[] = [];
    const isEmpty = (v: any) => v === undefined || v === null || String(v).trim() === '';

    // En nuevo no deben existir placas
    if (this.isNuevo) {
      clears.push('placas');
    } else {
      if (isEmpty(this.auto?.placas)) clears.push('placas');
    }

    if (isEmpty(this.auto?.descripcion)) clears.push('descripcion');
    // Si también quieres permitir borrar color en autos, descomenta:
    // if (isEmpty(this.auto?.color)) clears.push('color');
    return clears;
  }

  private getCamposVaciosMotos(): string[] {
    const clears: string[] = [];
    const isEmpty = (v: any) => v === undefined || v === null || String(v).trim() === '';

    // En moto nueva no debe haber placas
    if (this.isNuevo) {
      clears.push('placas');
    } else {
      if (isEmpty(this.auto?.placas)) clears.push('placas');
    }

    if (isEmpty(this.auto?.descripcion)) clears.push('descripcion');
    if (isEmpty(this.auto?.tipoMotor)) clears.push('tipoMotor');
    if (isEmpty(this.auto?.cilindrada)) clears.push('cilindrada');
    if (isEmpty(this.auto?.transmision)) clears.push('transmision');
    if (isEmpty(this.auto?.combustible)) clears.push('combustible');
    if (isEmpty(this.auto?.frenos)) clears.push('frenos');
    if (isEmpty(this.auto?.suspension)) clears.push('suspension');
    if (isEmpty(this.auto?.color)) clears.push('color');
    return clears;
  }

  enviarDatos_autos(id: string, formData: FormData) {
    this.carsService.putCar(id, formData).subscribe({
      next: async (res: any) => {
        await this.restablecerDatos();
        if (this.tipo_veiculo === 'renta') {
          this.router.navigate(['/mis-rentas']);
        } else {
          this.router.navigate(['/mis-autos']);
        }
        this.generalService.alert(
          'Éxito',
          'Vehículo actualizado correctamente.',
          'success'
        );
      },
      error: (err) => {
        const mensaje =
          err?.error?.message || 'Error al actualizar el vehículo';
        this.generalService.alert('Error', mensaje, 'danger');
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  enviarDatos_motos(id: string, formData: FormData) {
    this.motosService.putMoto(id, formData).subscribe({
      next: async (res: any) => {
        await this.restablecerDatos();
        this.router.navigate(['/mis-motos']);
        // ❌ quitamos reload para no perder estado
        this.generalService.alert(
          'Éxito',
          'Moto actualizada correctamente.',
          'success'
        );
      },
      error: (err) => {
        const mensaje =
          err?.error?.message || 'Error al actualizar el vehículo';
        this.generalService.alert('Error', mensaje, 'danger');
      },
      complete: () => {
        this.generalService.loadingDismiss();
      },
    });
  }

  // ------

  eliminarImagen_visual(imgUrl: string) {
    const indexNuevas = this.urlsImagenes.indexOf(imgUrl);
    const indexExistentes = this.urlsImagenesExistentes.indexOf(imgUrl);

    if (indexNuevas !== -1) {
      this.urlsImagenes.splice(indexNuevas, 1);
      this.imagenes.splice(indexNuevas, 1);
    }

    if (indexExistentes !== -1) {
      this.urlsImagenesExistentes.splice(indexExistentes, 1);
    }

    this.markDirtyFromUI();
  }

  regresar() {
    if (this.tipo_veiculo === 'autos') {
      this.router.navigate(['/mis-autos']);
    } else if (this.tipo_veiculo === 'motos') {
      this.router.navigate(['/mis-motos']);
    }
  }

  eliminarVersion(index: number) {
    const versionEliminada = this.auto.version[index];

    this.generalService.confirmarAccion(
      'Eliminar versión',
      `¿Estás seguro de eliminar la versión "${versionEliminada.Name}"?`,
      () => {
        this.auto.version.splice(index, 1);
        this.markDirtyFromUI();
      }
    );
  }

  async restablecerDatos() {
    // Vuelve al estado del servidor y rehace snapshot
    this.restablecer = false;
    this.imagenPrincipalMostrada = this.auto.imagenPrincipal;
    this.imagenPrincipal_sinFondo = null;
    this.urlsImagenes = [...this.auto.imagenes];
    this.urlsImagenesExistentes = [...this.auto.imagenes];
    this.imagenes = [];

    if (this.tipo_veiculo === 'autos') {
      this.auto.version = JSON.parse(JSON.stringify(this.versionesOriginales));
    }

    if (this.tipo_veiculo === 'motos') {
      this.precioMoto = this.auto.precio ?? null;
    }

    this.loteSeleccionado = null;
    this.ubicacionesLoteSeleccionado = [];
    this.direccionSeleccionada = null;
    this.ubicacionSeleccionada = null;

    if (this.auto.lote) {
      this.tipoSeleccionado = 'lote';
      this.loteSeleccionado = this.auto.lote._id;
      this.ubicacionesLoteSeleccionado = this.auto.lote.direccion || [];

      if (this.ubicacionesLoteSeleccionado.length === 1) {
        this.direccionSeleccionada = this.ubicacionesLoteSeleccionado[0];
      } else {
        if (this.direccionSeleccionadaActual) {
          const index = this.ubicacionesLoteSeleccionado.findIndex(
            (dir) =>
              dir.lat === this.direccionSeleccionadaActual.lat &&
              dir.lng === this.direccionSeleccionadaActual.lng
          );

          if (index !== -1) {
            this.direccionSeleccionada = this.ubicacionesLoteSeleccionado[index];
          } else {
            this.direccionSeleccionada = null;
          }
        } else {
          this.direccionSeleccionada = null;
        }
      }
    } else if (this.auto.ubicacion) {
      this.tipoSeleccionado = 'particular';
      const ubic = this.auto.ubicacion;

      this.ubicacionSeleccionada = [
        ubic.ciudad,
        ubic.estado,
        ubic.lat,
        ubic.lng,
      ];
    }

    // Recalcular snapshot base post-restablecer
    this.initialComparable = this.buildComparableState();
    this.restablecer = false;
  }

  getLotes(tipo: 'all' | 'mios') {
    this.registroService.allLotes(tipo).subscribe({
      next: async (res) => {
        this.lotes = res.lotes;
        this.totalLotes = this.lotes.length;

        if (this.totalLotes === 1) {
          this.seleccionarLote(this.lotes[0]._id, true);
        }

        this.tryFinalizeInit();
      },
      error: async (error) => {
        await this.generalService.loadingDismiss();
        await this.generalService.alert(
          'Verifica tu red',
          'Error de red. Intenta más tarde.',
          'danger'
        );
        this.tryFinalizeInit();
      },
    });
  }

  // fromInit=true => no marca sucio
  seleccionarLote(loteId: string, fromInit: boolean = false) {
    this.loteSeleccionado = loteId;
    const lote = this.lotes.find(l => l._id === loteId);
    this.ubicacionesLoteSeleccionado = lote?.direccion || [];
    this.leerLatLng();
    if (!fromInit) this.markDirtyFromUI();
  }

  async seleccionarUbicacion() {
    const modal = await this.modalController.create({
      component: MapaComponent,
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data) {
      this.ubicacionSeleccionada = data;
      this.markDirtyFromUI();
      if (this.ubicacionSeleccionada) {
        this.generalService.obtenerDireccionDesdeCoordenadas(this.ubicacionSeleccionada[2], this.ubicacionSeleccionada[3])
          .then((direccion) => {
            this.direccionCompleta = direccion;
          })
          .catch((error) => {
            this.direccionCompleta = 'No se pudo obtener la dirección.';
            console.warn(error);
          });
      }
    }
  }

  seleccionarTipo(tipo: 'particular' | 'lote') {
    this.tipoSeleccionado = tipo;
    this.markDirtyFromUI(); // marcar cambios solo si no es init
  }

  leerLatLng() {
    if (this.ubicacionesLoteSeleccionado.length === 1) {
      this.direccionSeleccionada = this.ubicacionesLoteSeleccionado[0];
      this.generalService.obtenerDireccionDesdeCoordenadas(
        this.direccionSeleccionada.lat,
        this.direccionSeleccionada.lng
      )
        .then((direccion) => {
          this.direccionCompleta = direccion;
        })
        .catch((error) => {
          this.direccionCompleta = 'No se pudo obtener la dirección.';
          console.warn(error);
        });
    } else {
      this.direccionSeleccionada = null;

      this.ubicacionesLoteLegibles = [];

      const promesas = this.ubicacionesLoteSeleccionado.map((dir) =>
        this.generalService.obtenerDireccionDesdeCoordenadas(dir.lat, dir.lng)
      );

      Promise.all(promesas)
        .then((direcciones) => {
          this.ubicacionesLoteLegibles = direcciones;

          if (this.direccionSeleccionadaActual) {
            const index = this.ubicacionesLoteSeleccionado.findIndex(
              (dir) =>
                dir.lat === this.direccionSeleccionadaActual.lat &&
                dir.lng === this.direccionSeleccionadaActual.lng
            );

            if (index !== -1) {
              this.direccionSeleccionada = this.ubicacionesLoteSeleccionado[index];
            }
          }
        })
        .catch((error) => {
          console.warn('❌ Error obteniendo direcciones:', error);
          this.ubicacionesLoteLegibles = this.ubicacionesLoteSeleccionado.map(() => 'No disponible');
        });
    }
  }

  onUbicacionChange(event: any) {
    this.markDirtyFromUI();
  }

  // ✅ para marcar el formulario como sucio desde inputs simples
  markDirty() {
    this.markDirtyFromUI();
  }

  // ==== Acciones ====
  onGuardarClick(): void {
    if (!this.auto?._id) return;
    if (!this.restablecer) {
      this.generalService.alert('Sin cambios', 'No hay cambios por guardar.', 'warning');
      return;
    }
    this.alertPutCar(this.auto._id);
  }

  onRestablecerClick(): void {
    if (!this.restablecer) {
      this.generalService.alert('Nada que restablecer', 'No has modificado nada.', 'info');
      return;
    }
    this.restablecerDatos();
  }
}
