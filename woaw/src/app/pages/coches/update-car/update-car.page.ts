import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router, NavigationStart } from '@angular/router';
import { GeneralService } from '../../../services/general.service';
import { ModalController } from '@ionic/angular';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CarsService } from '../../../services/cars.service';
import { environment } from 'src/environments/environment';
import { MotosService } from '../../../services/motos.service';
import imageCompression from 'browser-image-compression';
import { RegistroService } from '../../../services/registro.service';
import { MapaComponent } from '../../../components/modal/mapa/mapa.component';

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
  @ViewChild('mapAutoContainer', { static: false })
  mapAutoContainer!: ElementRef;
  mapAuto!: google.maps.Map;
  autoMarker!: google.maps.Marker;
  direccionCompleta: string = 'Obteniendo ubicación...';
  public tipo_veiculo: string = '';

  ubicacionesLoteLegibles: string[] = [];

  imagenPrincipal_sinFondo: File | string | null = null;
  imagenPrincipalMostrada: string = '';

  restablecer: boolean = false;
  // precioAlterado: boolean = false;
  versionesOriginales: any[] = [];
  lotes: any[] = [];
  totalLotes: number = 0;
  loteSeleccionado: string | null = null;
  direccionSeleccionada: any = null;
  direccionSeleccionadaActual: any = null
  ubicacionesLoteSeleccionado: any[] = [];
  tipoSeleccionado: 'particular' | 'lote' = 'particular';
  @ViewChild('inputArchivo', { static: false }) inputArchivo!: ElementRef;

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

  async ngOnInit() {
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    this.generalService.tipoRol$.subscribe((rol) => {
      if (rol === 'admin' || rol === 'lotero' || rol === 'vendedor' || rol === 'cliente' || rol === null) {
        this.MyRole = rol;
      } else {
        this.generalService.eliminarToken();
        this.generalService.alert(
          '¡Saliste de tu sesión Error - 707!',
          '¡Hasta pronto!',
          'info'
        );
      }
    });
    // Detectar tipo de dispositivo
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });
    // console.log(this.esDispositivoMovil);
    await this.obtenerVeiculo();
    if (this.MyRole === 'admin') {
      this.getLotes('all');
    } else if (this.MyRole == 'lotero') {
      this.getLotes('mios');
    }
  }
  async obtenerVeiculo() {
    this.tipo_veiculo = this.route.snapshot.paramMap.get('tipo') ?? '';
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    if (this.tipo_veiculo === 'autos') {
      this.autosURL(id);
    } else if (this.tipo_veiculo === 'motos') {
      this.motosURL(id);
    }
  }
  async autosURL(id: string) {
    this.carsService.getCar(id).subscribe({
      next: (res: any) => {
        this.auto = res;
        console.log(this.auto)
        this.imagenPrincipalMostrada = this.auto.imagenPrincipal;
        this.urlsImagenes = [...this.auto.imagenes];
        this.urlsImagenesExistentes = [...res.imagenes];
        this.versionesOriginales = JSON.parse(
          JSON.stringify(this.auto.version)
        );

        if (res.lote != null) {
          console.log('heyyyy')
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
            .then((direccion) => {
              this.direccionCompleta = direccion;
            })
            .catch((error) => {
              this.direccionCompleta = 'No se pudo obtener la dirección.';
              console.warn(error);
            });
        }
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
        this.auto = res;
        this.precioMoto = res.precio ?? null;
        this.imagenPrincipalMostrada = this.auto.imagenPrincipal;
        this.urlsImagenes = [...this.auto.imagenes];
        this.urlsImagenesExistentes = [...res.imagenes];
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
        // console.log('📍 Dirección obtenida:', direccion);
      })
      .catch((error) => {
        this.direccionCompleta = 'No se pudo obtener la dirección.';
        console.warn(error);
      });
  }
  // ##----- Imagenes -----
  actualizarImagenPrincipal(nuevaImagen: string) {
    // console.log(nuevaImagen);
    this.generalService.confirmarAccion(
      '¿Deseas usar esta imagen como imagen principal del vehículo?',
      'Establecer como principal',
      () => {
        // this.ActualizaImgen = true;
        this.selecionarUnaExistente(nuevaImagen);
      }
    );
  }
  selecionarUnaExistente(nuevaImagen: string) {
    this.imagenPrincipalMostrada = nuevaImagen;
    this.imagenPrincipal_sinFondo = nuevaImagen;
    this.restablecer = true;
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
      this.imagenPrincipal_sinFondo = comprimido;
      this.restablecer = true;
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
      this.imagenes.push(comprimido);
      this.restablecer = true;
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

  // ## ----- Actualizar auto
  // ## ----- Actualizar auto o moto

  verificarCambiosPrecio(): void {
    // 🏎 Si es auto con versiones
    if (this.tipo_veiculo === 'autos') {
      if (!this.auto?.version || !this.versionesOriginales?.length) return;

      const hayCambios = this.auto.version.some((v: any, i: number) => {
        return v.Precio !== this.versionesOriginales[i]?.Precio;
      });

      this.restablecer = hayCambios;
      return;
    }

    // 🏍 Si es moto con precio en raíz
    if (this.tipo_veiculo === 'motos') {
      if (this.precioMoto === null || this.auto?.precio === undefined) return;

      this.restablecer = this.precioMoto !== this.auto.precio;
    }
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

      if (this.tipo_veiculo === 'autos') {
        formData = await this.agregarVersionesAlFormData_autos(formData);
        formData = await this.agregarUbicacionAlFormData_autos(formData);
        this.enviarDatos_autos(id, formData);
      } else if (this.tipo_veiculo === 'motos') {
        formData = await this.agregarPrecioAlFormData_Motos(formData);
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

      // await this.generalService.alert(
      //   'Error al procesar la información',
      //   mensaje,
      //   'warning'
      // );
    }
  }
  private async generarFormDataImagenes(): Promise<FormData> {
    const formData = new FormData();

    if (this.imagenPrincipal_sinFondo) {
      formData.append('imagenPrincipal', this.imagenPrincipal_sinFondo);
      formData.append('imagenes', this.imagenPrincipal_sinFondo);
    }

    for (const img of this.imagenes) {
      const comprimido = await imageCompression(img, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
      formData.append('imagenes', comprimido);
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

      const versionesValidas = [];

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
  private async agregarUbicacionAlFormData_autos(
    formData: FormData
  ): Promise<FormData> {
    return new Promise(async (resolve, reject) => {

      let ubicacionObj: any = null;

      if (this.tipoSeleccionado === 'particular' && this.ubicacionSeleccionada) {

        const [ciudad, estado, lat, lng] = this.ubicacionSeleccionada;

        if (!ciudad || !estado || !lat || !lng) {
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

        if (!direccion || !direccion.ciudad || !direccion.estado || !direccion.lat || !direccion.lng) {
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
      // ⚠️ Validar que el precio exista y sea válido
      if (
        this.precioMoto === null ||
        this.precioMoto === undefined ||
        isNaN(this.precioMoto) ||
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

      // ✅ Agregar el precio al formData
      formData.append('precio', String(this.precioMoto));
      resolve(formData);
    });
  }
  enviarDatos_autos(id: string, formData: FormData) {
    this.carsService.putCar(id, formData).subscribe({
      next: async (res: any) => {
        this.generalService.alert(
          'Éxito',
          'Vehículo actualizado correctamente.',
          'success'
        );
        await this.restablecerDatos();
        this.router.navigate(['/mis-autos']);
        setTimeout(() => {
          location.reload();
        }, 1000);
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
        this.generalService.alert(
          'Éxito',
          'Moto actualizado correctamente.',
          'success'
        );
        await this.restablecerDatos();
        this.router.navigate(['/mis-motos']);
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
      this.restablecer = true;
    }

    if (indexExistentes !== -1) {
      this.urlsImagenesExistentes.splice(indexExistentes, 1);
      this.restablecer = true;
    }

    this.restablecer = true;
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
        this.restablecer = true;
        this.auto.version.splice(index, 1);
      }
    );
  }
  async restablecerDatos() {
    this.restablecer = false;
    // this.precioAlterado = false;
    this.imagenPrincipalMostrada = this.auto.imagenPrincipal;
    this.imagenPrincipal_sinFondo = null;
    this.urlsImagenes = [...this.auto.imagenes];
    this.urlsImagenesExistentes = [...this.auto.imagenes];
    this.imagenes = [];
    // 🏎 Autos: restablece versiones
    if (this.tipo_veiculo === 'autos') {
      this.auto.version = JSON.parse(JSON.stringify(this.versionesOriginales));
    }
    // 🏍 Motos: restablece precio raíz
    if (this.tipo_veiculo === 'motos') {
      this.precioMoto = this.auto.precio ?? null;
    }
    // ----
    this.loteSeleccionado = null;
    this.ubicacionesLoteSeleccionado = [];
    this.direccionSeleccionada = null;
    this.ubicacionSeleccionada = null;

    // Restaurar según los datos originales del auto
    // Restaurar según los datos originales del auto
    if (this.auto.lote) {
      this.tipoSeleccionado = 'lote';
      this.loteSeleccionado = this.auto.lote._id;
      this.ubicacionesLoteSeleccionado = this.auto.lote.direccion || [];

      if (this.ubicacionesLoteSeleccionado.length === 1) {
        this.direccionSeleccionada = this.ubicacionesLoteSeleccionado[0];
      } else {
        // ✅ Buscar y seleccionar la ubicación original
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
  }
  getLotes(tipo: 'all' | 'mios') {
    this.registroService.allLotes(tipo).subscribe({
      next: async (res) => {
        this.lotes = res.lotes;
        this.totalLotes = this.lotes.length;

        if (this.totalLotes === 1) {
          this.seleccionarLote(this.lotes[0]._id);
        }
      },
      error: async (error) => {
        await this.generalService.loadingDismiss();
        await this.generalService.alert(
          'Verifica tu red',
          'Error de red. Intenta más tarde.',
          'danger'
        );
      },
    });
  }
  seleccionarLote(loteId: string) {
    this.loteSeleccionado = loteId;
    const lote = this.lotes.find(l => l._id === loteId);
    this.ubicacionesLoteSeleccionado = lote?.direccion || [];
    this.leerLatLng();
    this.restablecer = true;
  }
  async seleccionarUbicacion() {
    const modal = await this.modalController.create({
      component: MapaComponent,
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data) {
      this.ubicacionSeleccionada = data;
      this.restablecer = true;
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

          // ✅ Buscar y seleccionar automáticamente la ubicación actual
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
    this.restablecer = true;
  }

}
