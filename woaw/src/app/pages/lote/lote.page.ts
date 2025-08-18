import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationStart } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription, filter } from 'rxjs';
import { LoteService } from '../../services/lote.service';
import { GeneralService } from '../../services/general.service';
import { PopoverController } from '@ionic/angular';
import { ListComponent } from '../../components/filtos/list/list.component';
import { RegistroService } from '../../services/registro.service';

interface Direccion {
  ciudad: string;
  estado: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-lote',
  templateUrl: './lote.page.html',
  styleUrls: ['./lote.page.scss'],
  standalone: false
})
export class LotePage implements OnInit, OnDestroy {
  loteId!: string;
  lote: any | null = null;

  isOwner = false;
  private myLotIds: Set<string> = new Set();

  autosStorage: any[] = [];
  private navSub?: Subscription;
  direccionCompleta = 'Obteniendo ubicación...';
  carrosDelLote: any[] = [];
  motosDelLote: any[] = [];
  ordenActivo: string | null = null;
  previewImagenPrincipal: string | null = null;

  filtros = [
    { label: 'Marca', tipo: 'marca' },
    { label: 'Precio', tipo: 'precio' },
    { label: 'Tipo', tipo: 'tipo' },
    { label: 'Año', tipo: 'anio' },
  ];
  filtrosAplicados: any = {
    precio: null,
    anio: null,
    color: null,
    marca: null,
  };

  public totalAutos: number = 0;
  paginaActual = 1;
  itemsPorPagina!: number;
  totalPaginas = 1;
  paginas: number[] = [];
  autosPaginados: any[] = [];
  public autosFiltrados: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private popoverCtrl: PopoverController,
    private loteService: LoteService,
    private generalService: GeneralService,
    private toastCtrl: ToastController,
    private registroService: RegistroService
  ) {}

  ngOnInit(): void {
    this.loteId = this.route.snapshot.paramMap.get('id')!;
    this.cargarLote();
    this.cargarCarros();
    this.cargarMotos();
    this.verificarPropiedadDelLote();

    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe(() => {
        localStorage.removeItem('origenLote');
      });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  private cargarLote(): void {
    this.loteService.getLoteById(this.loteId).subscribe({
      next: (lote) => {
        this.lote = lote;
        this.previewImagenPrincipal = lote?.imagenPrincipal || null;

        // Revalidar propiedad si ya cargamos mis lotes
        if (!this.isOwner && this.myLotIds.size > 0) {
          const currentId = this.normId(this.loteId);
          this.isOwner = !!currentId && this.myLotIds.has(currentId);
        }

        if (Array.isArray(lote?.direccion) && lote.direccion.length) {
          const d = lote.direccion[0] as Direccion;
          this.generalService
            .obtenerDireccionDesdeCoordenadas(d.lat, d.lng)
            .then((dir) => (this.direccionCompleta = dir))
            .catch(() => (this.direccionCompleta = 'No se pudo obtener la dirección.'));
        }
      },
      error: async () => {
        await this.generalService.alert('Error', 'No se pudo cargar el lote', 'danger');
        this.router.navigateByUrl('/lotes');
      },
    });
  }

  private cargarCarros(): void {
    this.loteService.getcarro(this.loteId).subscribe({
      next: (res) => {
        this.carrosDelLote = res || [];
        this.totalAutos = this.carrosDelLote.length;
      },
      error: async () => {
        // silencioso
      },
    });
  }

    private cargarMotos(): void {
    this.loteService.getmoto(this.loteId).subscribe({
      next: (res) => {
        this.motosDelLote = res || [];
        this.totalAutos = this.motosDelLote.length;
        console.log(this.motosDelLote);
      },
      error: async () => {
        // silencioso
      },
    });
  }

  private verificarPropiedadDelLote(): void {
    this.registroService.allLotes('mios').subscribe({
      next: (res) => {
        const lista: any[] = Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.data)
          ? (res as any).data
          : Array.isArray((res as any)?.lotes)
          ? (res as any).lotes
          : [];

        // Normaliza y arma el set de IDs
        this.myLotIds = new Set(
          lista
            .map((x: any) => this.normId(x?._id || x?.id))
            .filter((id: string) => !!id)
        );

        const currentId = this.normId(this.loteId);
        this.isOwner = !!currentId && this.myLotIds.has(currentId);
      },
      error: () => {
        this.isOwner = false;
      },
    });
  }

  editarLote(): void {
    if (!this.lote) return;

    if (!this.isOwner) {
      this.toastCtrl
        .create({ message: 'No puedes editar este lote.', duration: 1500 })
        .then((t) => t.present());
      return;
    }

    this.router.navigate(['/lote-edit', this.lote._id]);
  }

  async copiarTelefono(): Promise<void> {
    if (!this.lote?.telefonoContacto) return;
    try {
      await navigator.clipboard.writeText(this.lote.telefonoContacto);
      const t = await this.toastCtrl.create({ message: 'Teléfono copiado', duration: 1500 });
      t.present();
    } catch {}
  }

  volver(): void {
    this.router.navigate(['/lotes']);
  }

  ordenarAutos(criterio: string) {
    this.ordenActivo = criterio;
    const base = this.autosFiltrados.length ? this.autosFiltrados : [...this.carrosDelLote];

    switch (criterio) {
      case 'precioAsc':
        base.sort((a, b) => a.precioDesde - b.precioDesde);
        break;
      case 'precioDesc':
        base.sort((a, b) => b.precioDesde - a.precioDesde);
        break;
      default:
        base.sort((a, b) => b.anio - a.anio);
        break;
    }

    this.autosFiltrados = base;
    this.totalPaginas = Math.ceil(base.length / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.autosPaginados = base.slice(0, this.itemsPorPagina);
  }

  async mostrarOpciones(ev: Event, tipo: string) {
    const popover = await this.popoverCtrl.create({
      component: ListComponent,
      event: ev,
      translucent: true,
      componentProps: { tipo },
    });

    await popover.present();
    const { data } = await popover.onDidDismiss();

    if (data === null) {
      (this.filtrosAplicados as any)[tipo] = null;
    } else {
      (this.filtrosAplicados as any)[tipo] = data;
    }

    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let autosFiltrados = [...this.autosStorage];

    const { precio, anio, color, marca, tipo } = this.filtrosAplicados;

    if (precio) {
      autosFiltrados = autosFiltrados.filter(
        (auto) => auto.precioDesde >= precio.rango[0] && auto.precioDesde <= precio.rango[1]
      );
    }

    if (anio) {
      autosFiltrados = autosFiltrados.filter((auto) => auto.anio === anio.anio);
    }

    if (color) {
      autosFiltrados = autosFiltrados.filter(
        (auto) => auto.color?.toLowerCase() === color.label.toLowerCase()
      );
    }

    if (marca) {
      autosFiltrados = autosFiltrados.filter(
        (auto) => auto.marca.toLowerCase() === marca.label.toLowerCase()
      );
    }

    if (tipo) {
      autosFiltrados = autosFiltrados.filter(
        (auto) => auto.tipoVehiculo?.toLowerCase() === tipo.label.toLowerCase()
      );
    }

    this.autosFiltrados = autosFiltrados;
    this.totalPaginas = Math.ceil(autosFiltrados.length / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.autosPaginados = autosFiltrados.slice(0, this.itemsPorPagina);
  }

  resetearFiltros() {
    this.filtrosAplicados = {};
    this.aplicarFiltros();
  }

  // Helpers
  private normId(id: any): string {
    return String(id ?? '').trim().toLowerCase();
  }
}
