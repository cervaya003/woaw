import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, NavigationStart } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription, filter } from 'rxjs';
import { LoteService } from '../../services/lote.service';
import { GeneralService } from '../../services/general.service';

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
export class LotePage implements OnInit {
  loteId!: string;
  lote: any | null = null;
  autosStorage: any[] = [];
  private navSub?: Subscription;
  direccionCompleta = 'Obteniendo ubicación...';
  carrosDelLote: any[] = [];
  ordenActivo: string | null = null;
  previewImagenPrincipal: string | null = null;
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
    private loteService: LoteService,
    private generalService: GeneralService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit(): void {
    this.loteId = this.route.snapshot.paramMap.get('id')!;
    this.cargarLote();
    this.cargarCarros();
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe(() => {
        localStorage.removeItem('origenLote');
      });
  }

  private cargarLote(): void {
    this.loteService.getLoteById(this.loteId).subscribe({
      next: (lote) => {
        this.lote = lote;
        this.previewImagenPrincipal = lote?.imagenPrincipal || null;

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
        // await this.generalService.alert('Verifica tu red', 'Error de red. Intenta más tarde.', 'danger');
      },
    });
}

editarLote(): void {
  if(!this.lote) return;
  this.router.navigate(['/lote-edit', this.lote._id]);
}

  async copiarTelefono(): Promise < void> {
  if(!this.lote?.telefonoContacto) return;
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
  const base = this.autosFiltrados.length
    ? this.autosFiltrados
    : [...this.carrosDelLote];

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
}
