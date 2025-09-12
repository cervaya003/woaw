import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { RentaService } from '../../services/renta.service';
import { GeneralService } from '../../services/general.service';
import imageCompression from 'browser-image-compression';
import { MapaComponent } from '../../components/modal/mapa/mapa.component';

type UbicSel = [string, string, number, number] | null;

@Component({
  selector: 'app-edit-renta',
  templateUrl: './edit-renta.page.html',
  styleUrls: ['./edit-renta.page.scss'],
  standalone: false,
})
export class EditRentaPage implements OnInit {
  @ViewChild('inputArchivo', { static: false }) inputArchivo!: ElementRef<HTMLInputElement>;

  id!: string;

  renta: any = {
    marca: '',
    modelo: '',
    anio: null, // visual only
    precioPorDia: 0,
    moneda: 'MXN', // visual only (no se envía)

    politicaCombustible: 'lleno-lleno',
    politicaLimpieza: 'normal',
    requisitosConductor: {
      edadMinima: 21,
      antiguedadLicenciaMeses: 12,
      permiteConductorAdicional: false,
      costoConductorAdicional: 0,
    },
    entrega: {
      gratuitoHastaKm: 0,
      tarifasPorDistancia: [] as any[],
    },
    polizaPlataforma: {
      numero: '',
      aseguradora: '',
      aseguradoraOtra: '',
      cobertura: '',
      vigenciaDesde: '',
      vigenciaHasta: '',
      urlPoliza: '',
    },
    ubicacion: null as any,
    imagenPrincipal: '',
    imagenes: [] as string[],
  };

  // ubicación
  ubicacionSeleccionada: UbicSel = null;
  direccionCompleta = '';

  // imágenes
  imagenPrincipalMostrada = '';
  imagenPrincipalFile: File | string | null = null;
  urlsImagenes: string[] = [];
  urlsImagenesExistentes: string[] = [];
  imagenesNuevas: File[] = [];

  // control de cambios
  dirty = false;
  private snapshot: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rentaService: RentaService,
    private general: GeneralService,
    private modalCtrl: ModalController,
  ) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.cargarRenta();
  }

  // ===== Helpers de fecha (sólo UI de póliza) =====

  private toYMD(value: any): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }


  // ===== snapshot/dirty =====
  private snapshotState() {
    return JSON.stringify({
      renta: this.renta,
      ubic: this.ubicacionSeleccionada,
      imgP: this.imagenPrincipalMostrada,
      imgs: [...this.urlsImagenes].sort(),
    });
  }
  private refreshDirty() { this.dirty = this.snapshot !== this.snapshotState(); }
  markDirty() { this.refreshDirty(); }

  // ===== Cargar datos =====
  async cargarRenta() {
    await this.general.loading('Cargando...');
    this.rentaService.cochePorId(this.id).subscribe({
      next: async (res: any) => {
        const price = res?.precio ?? {};
        const req = res?.requisitosConductor ?? {};
        const ent = res?.entrega ?? {};

        const pol = res?.polizaPlataforma ?? {}; // sólo UI

        const normalizada = {
          marca: res?.marca ?? this.renta.marca,
          modelo: res?.modelo ?? this.renta.modelo,

          anio: res?.anio ?? this.renta.anio, // visual only

          // precio (normaliza por compatibilidad)
          precioPorDia: Number(price?.porDia ?? res?.precioPorDia ?? res?.precio ?? this.renta.precioPorDia),
          moneda: price?.moneda ?? res?.moneda ?? this.renta.moneda, // visual only

          // políticas
          politicaCombustible: res?.politicaCombustible ?? this.renta.politicaCombustible,
          politicaLimpieza: res?.politicaLimpieza ?? this.renta.politicaLimpieza,

          // requisitos
          requisitosConductor: {
            edadMinima: Number(req?.edadMinima ?? this.renta.requisitosConductor.edadMinima),
            antiguedadLicenciaMeses: Number(req?.antiguedadLicenciaMeses ?? this.renta.requisitosConductor.antiguedadLicenciaMeses),
            permiteConductorAdicional: !!(req?.permiteConductorAdicional ?? this.renta.requisitosConductor.permiteConductorAdicional),
            costoConductorAdicional: Number(req?.costoConductorAdicional ?? this.renta.requisitosConductor.costoConductorAdicional),
          },

          // entrega
          entrega: {
            gratuitoHastaKm: Number(ent?.gratuitoHastaKm ?? this.renta.entrega.gratuitoHastaKm),
            tarifasPorDistancia: Array.isArray(ent?.tarifasPorDistancia)
              ? ent.tarifasPorDistancia
              : [...this.renta.entrega.tarifasPorDistancia],
          },

          // póliza solo UI

          polizaPlataforma: {
            numero: pol?.numero ?? this.renta.polizaPlataforma.numero,
            aseguradora: pol?.aseguradora ?? this.renta.polizaPlataforma.aseguradora,
            aseguradoraOtra: pol?.aseguradoraOtra ?? this.renta.polizaPlataforma.aseguradoraOtra,
            cobertura: pol?.cobertura ?? this.renta.polizaPlataforma.cobertura,
            vigenciaDesde: this.toYMD(pol?.vigenciaDesde ?? this.renta.polizaPlataforma.vigenciaDesde),
            vigenciaHasta: this.toYMD(pol?.vigenciaHasta ?? this.renta.polizaPlataforma.vigenciaHasta),
            urlPoliza: pol?.urlPoliza ?? this.renta.polizaPlataforma.urlPoliza,
          },

          ubicacion: res?.ubicacion ?? null,
          imagenPrincipal: res?.imagenPrincipal ?? this.renta.imagenPrincipal,
          imagenes: Array.isArray(res?.imagenes) ? res.imagenes : [...this.renta.imagenes],
        };

        this.renta = { ...this.renta, ...normalizada };

        // ubicación UI
        if (this.renta.ubicacion) {
          const u = this.renta.ubicacion;
          this.ubicacionSeleccionada = [u.ciudad || '', u.estado || '', Number(u.lat) || 0, Number(u.lng) || 0];
          try {
            this.direccionCompleta = await this.general.obtenerDireccionDesdeCoordenadas(Number(u.lat), Number(u.lng));
          } catch {
            this.direccionCompleta = 'No se pudo obtener la dirección';
          }
        } else {
          this.ubicacionSeleccionada = null;
          this.direccionCompleta = '';
        }

        // imágenes UI
        this.imagenPrincipalMostrada = this.renta.imagenPrincipal || '';
        this.imagenPrincipalFile = this.renta.imagenPrincipal || null;
        this.urlsImagenes = [...this.renta.imagenes];
        this.urlsImagenesExistentes = [...this.renta.imagenes];

        this.snapshot = this.snapshotState();
        this.dirty = false;

        await this.general.loadingDismiss();
      },
      error: async (err: any) => {
        await this.general.loadingDismiss();
        this.general.alert('Error', err?.error?.message || 'No se pudo cargar la renta', 'danger');
      },
    });
  }

  // ===== Ubicación
  async seleccionarUbicacion() {
    const modal = await this.modalCtrl.create({ component: MapaComponent });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) {
      this.ubicacionSeleccionada = data as UbicSel; // [ciudad, estado, lat, lng]
      this.markDirty();
      try {
        this.direccionCompleta = await this.general.obtenerDireccionDesdeCoordenadas(data[2], data[3]);
      } catch { this.direccionCompleta = 'No se pudo obtener la dirección'; }
    }
  }

  // ===== Tarifas
  addTarifa() {
    if (!Array.isArray(this.renta.entrega.tarifasPorDistancia)) {
      this.renta.entrega.tarifasPorDistancia = [];
    }
    const anterior = this.renta.entrega.tarifasPorDistancia.at(-1);
    this.renta.entrega.tarifasPorDistancia.push({

      desdeKm: anterior ? (Number(anterior.hastaKm) || 0) : (Number(this.renta.entrega.gratuitoHastaKm) || 0),

      hastaKm: 0,
      costoFijo: 0,
      costoPorKm: 0,
      nota: ''
    });
    this.markDirty();
  }
  removeTarifa(i: number) {
    this.renta.entrega.tarifasPorDistancia.splice(i, 1);
    this.markDirty();
  }
  onGratisHastaChange() {
    if (Array.isArray(this.renta.entrega.tarifasPorDistancia) && this.renta.entrega.tarifasPorDistancia.length) {
      this.renta.entrega.tarifasPorDistancia[0].desdeKm = Number(this.renta.entrega.gratuitoHastaKm) || 0;
    }
    this.markDirty();
  }
  onTarifaHastaChange(_: number) { this.markDirty(); }

  // ===== Imágenes
  seleccionarImagen() { this.inputArchivo.nativeElement.click(); }

  async cargarNuevaImagen(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.general.alert('Imagen demasiado grande', 'Máximo 10MB.', 'warning'); return;
    }

    try {
      const comprimido = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 1600, useWebWorker: true });
      const previewUrl = URL.createObjectURL(comprimido);
      this.imagenPrincipalMostrada = previewUrl;
      this.imagenPrincipalFile = comprimido;
      this.markDirty();
      this.general.alert('Listo', 'Imagen principal actualizada.', 'success');
    } catch {
      this.general.alert('Error', 'No se pudo procesar la imagen.', 'danger');
    }
  }

  actualizarImagenPrincipal(img: string) {
    this.general.confirmarAccion('¿Usar esta imagen como principal?', 'Establecer', () => {
      this.imagenPrincipalMostrada = img;
      this.imagenPrincipalFile = img; // string (URL existente)
      this.markDirty();
    });
  }

  async agregarImagen(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    if (!file) return;
    if (this.urlsImagenes.length >= 10) {
      this.general.alert('Límite alcanzado', 'Máximo 10 imágenes.', 'warning'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.general.alert('Imagen demasiado grande', 'Máximo 10MB.', 'warning'); return;
    }
    try {
      const comprimido = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 1600, useWebWorker: true });
      const previewUrl = URL.createObjectURL(comprimido);
      this.urlsImagenes.push(previewUrl);
      this.imagenesNuevas.push(comprimido);
      this.markDirty();
    } catch {
      this.general.alert('Error', 'No se pudo procesar la imagen.', 'danger');
    }
  }

  eliminarImagen_visual(imgUrl: string) {
    const iNueva = this.urlsImagenes.indexOf(imgUrl);
    if (iNueva !== -1) this.urlsImagenes.splice(iNueva, 1);

    const iExist = this.urlsImagenesExistentes.indexOf(imgUrl);
    if (iExist !== -1) this.urlsImagenesExistentes.splice(iExist, 1);

    this.markDirty();
  }

  // ===== Guardar
  async onGuardarClick() {
    if (!this.dirty) {
      this.general.alert('Sin cambios', 'No hay cambios por guardar.', 'info');
      return;
    }
    // Validaciones mínimas
    if (!this.renta.precioPorDia || this.renta.precioPorDia < 100) {
      this.general.alert('Precio inválido', 'Ingresa un precio por día válido (>= 100).', 'warning');
      return;
    }
    if (!this.ubicacionSeleccionada) {
      this.general.alert('Ubicación', 'Selecciona una ubicación.', 'warning');
      return;
    }


    await this.general.loading('Guardando...');

    try {
      const [ciudad, estado, lat, lng] = this.ubicacionSeleccionada!;

      // ⚠️ Backend nuevo: NO enviar anio, version, color, kilometraje, NI póliza.
      // También 'precio' como number (no objeto) y sin 'moneda'.
      const data: any = {
        precio: Number(this.renta.precioPorDia),
        politicaCombustible: this.renta.politicaCombustible || 'lleno-lleno',
        politicaLimpieza: this.renta.politicaLimpieza || 'normal',
        requisitosConductor: {
          edadMinima: Number(this.renta.requisitosConductor.edadMinima ?? 21),
          antiguedadLicenciaMeses: Number(this.renta.requisitosConductor.antiguedadLicenciaMeses ?? 12),
          permiteConductorAdicional: !!this.renta.requisitosConductor.permiteConductorAdicional,
          costoConductorAdicional:
            this.renta.requisitosConductor.costoConductorAdicional != null
              ? Number(this.renta.requisitosConductor.costoConductorAdicional)
              : undefined,
        },
        entrega: {
          gratuitoHastaKm: Number(this.renta.entrega.gratuitoHastaKm) || 0,
          tarifasPorDistancia: (this.renta.entrega.tarifasPorDistancia || []).map((t: any) => ({
            desdeKm: Number(t.desdeKm) || 0,
            hastaKm: Number(t.hastaKm) || 0,
            costoFijo: t.costoFijo != null ? Number(t.costoFijo) : undefined,
            costoPorKm: t.costoPorKm != null ? Number(t.costoPorKm) : undefined,
            nota: t.nota || undefined,
          })),
        },
        ubicacion: { ciudad, estado, lat, lng },
        imagenesExistentes: this.urlsImagenesExistentes, // para que backend conserve las que queden
      };

      // Si NO subes archivo para principal, manda URL
      if (typeof this.imagenPrincipalFile === 'string' && this.imagenPrincipalFile.trim()) {
        data.imagenPrincipal = this.imagenPrincipalFile;
      }

      // Archivos
      const files: any = {};
      if (this.imagenPrincipalFile instanceof File) files.imagenPrincipal = this.imagenPrincipalFile;
      if (this.imagenesNuevas.length) files.imagenes = this.imagenesNuevas;

      this.rentaService.updateRentalCar(this.id, data, files).subscribe({
        next: async () => {
          await this.general.loadingDismiss();
          this.general.alert('Éxito', 'Renta actualizada correctamente.', 'success');
          this.regresar();
        },
        error: async (err: any) => {
          await this.general.loadingDismiss();
          this.general.alert('Error', err?.error?.message || 'No se pudo actualizar', 'danger');
        }
      });
    } catch (_e) {
      await this.general.loadingDismiss();
      this.general.alert('Error', 'Ocurrió un error al preparar los datos.', 'danger');
    }
  }

  onRestablecerClick() {
    if (!this.snapshot) return;
    this.cargarRenta(); // recarga desde servidor
  }

  regresar() { this.router.navigate(['/mis-autos']); }

}
