import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { GeneralService } from '../../../services/general.service';
import { CarsService } from '../../../services/cars.service';
import { MotosService } from '../../../services/motos.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ListComponent implements OnInit {
  @Input() tipo: string = '';
  @Input() extra?: string;

  // 🔎 estado de búsqueda
  query: string = '';

  // fuente original (sin "Quitar filtro")
  private opcionesBase: any[] = [];

  // arreglo que se muestra (filtrado)
  opcionesFiltradas: any[] = [];

  constructor(
    private popoverCtrl: PopoverController,
    private generalService: GeneralService,
    private carsService: CarsService,
    private motosService: MotosService
  ) {}

  ngOnInit() {
    // Construir opciones según el tipo
    if (this.tipo === 'precio') {
      this.opcionesBase = [
        { label: 'Menos de $100,000', rango: [0, 99999] },
        { label: '$100,000 - $149,999', rango: [100000, 149999] },
        { label: '$150,000 - $199,999', rango: [150000, 199999] },
        { label: '$200,000 - $249,999', rango: [200000, 249999] },
        { label: '$250,000 - $299,999', rango: [250000, 299999] },
        { label: '$300,000 - $399,999', rango: [300000, 399999] },
        { label: '$400,000 - $499,999', rango: [400000, 499999] },
        { label: '$500,000 - $699,999', rango: [500000, 699999] },
        { label: '$700,000 - $999,999', rango: [700000, 999999] },
        { label: 'Más de $1,000,000', rango: [1000000, Infinity] },
      ];
      this.applyFilter();
    } else if (this.tipo === 'anio') {
      const anioActual = new Date().getFullYear();
      const url = window.location.pathname;

      if (url.includes('/seminuevos')) {
        this.opcionesBase = this.generarRangoAnios(anioActual - 1, anioActual - 5);
      } else if (url.includes('/usados')) {
        this.opcionesBase = this.generarRangoAnios(anioActual - 6, 2008);
      } else {
        this.opcionesBase = this.generarRangoAnios(anioActual, 1950);
      }
      this.applyFilter();
    } else if (this.tipo === 'color') {
      this.opcionesBase = [
        { label: 'Blanco' }, { label: 'Negro' }, { label: 'Gris' }, { label: 'Plateado' },
        { label: 'Rojo' }, { label: 'Azul' }, { label: 'Azul marino' }, { label: 'Verde' },
        { label: 'Verde oscuro' }, { label: 'Beige' }, { label: 'Café' }, { label: 'Amarillo' },
        { label: 'Naranja' }, { label: 'Morado' }, { label: 'Vino' }, { label: 'Oro' },
        { label: 'Bronce' }, { label: 'Turquesa' }, { label: 'Gris Oxford' }, { label: 'Arena' },
        { label: 'Azul cielo' }, { label: 'Grafito' }, { label: 'Champagne' }, { label: 'Titanio' },
        { label: 'Cobre' }, { label: 'Camaleón' }, { label: 'Otro' },
      ];
      this.applyFilter();
    } else if (this.tipo === 'marca') {
      if (this.extra === 'motos') {
        this.getMarcas_motos();
      } else if (this.extra === 'camiones') {
        // si hay lógica especial para camiones, colócala aquí y luego this.applyFilter();
        this.opcionesBase = [];
        this.applyFilter();
      } else {
        this.getMarcas_cohes();
      }
    } else if (this.tipo === 'tipo') {
      if (this.extra === 'motos') {
        // lógica para tipos de motos si aplica
        this.opcionesBase = [];
        this.applyFilter();
      } else if (this.extra === 'camiones') {
        // lógica para tipos de camiones si aplica
        this.opcionesBase = [];
        this.applyFilter();
      } else {
        this.getTipos_coches();
      }
    } else {
      this.opcionesBase = [];
      this.applyFilter();
    }
  }

  // ————— eventos búsqueda —————
  onSearchChange(ev: any) {
    this.query = (ev?.target?.value ?? '').toString();
    this.applyFilter();
  }

  onClear() {
    this.query = '';
    this.applyFilter();
  }

  // Aplica filtro sobre opcionesBase, insensible a mayúsculas/acentos
  private applyFilter() {
    const q = this.normalize(this.query);
    if (!q) {
      this.opcionesFiltradas = [...this.opcionesBase];
      return;
    }

    this.opcionesFiltradas = this.opcionesBase.filter(op => {
      // buscamos en label y también en key si existe
      const label = this.normalize(op?.label);
      const key   = this.normalize(op?.key);
      return label.includes(q) || key.includes(q);
    });
  }

  seleccionar(opcion: any) {
    if (opcion?.quitar) {
      this.popoverCtrl.dismiss(null);
    } else {
      this.popoverCtrl.dismiss(opcion);
    }
  }

  // ————— helpers —————
  generarRangoAnios(desde: number, hasta: number): any[] {
    const lista: any[] = [];
    for (let anio = desde; anio >= hasta; anio--) {
      lista.push({ label: anio.toString(), anio, key: anio.toString() });
    }
    return lista;
  }

  ocultarImagen(event: any) {
    event.target.style.display = 'none';
  }

  obtenerColorHex(nombre: string): string {
    const colores: { [key: string]: string } = {
      Blanco: '#FFFFFF', Negro: '#000000', Gris: '#808080', 'Gris Oxford': '#4B4B4B', Plateado: '#C0C0C0',
      Rojo: '#FF0000', Azul: '#0000FF', 'Azul marino': '#000080', 'Azul cielo': '#87CEEB',
      Verde: '#008000', 'Verde oscuro': '#006400', Beige: '#F5F5DC', Café: '#8B4513',
      Amarillo: '#FFFF00', Naranja: '#FFA500', Morado: '#800080', Vino: '#800000',
      Oro: '#FFD700', Bronce: '#CD7F32', Turquesa: '#40E0D0', Arena: '#D6A77A',
      Grafito: '#3B3B3B', Champagne: '#F7E7CE', Titanio: '#8C8C8C', Cobre: '#B87333',
      Camaleón: '#7FFF00', Otro: '#999999',
    };
    return colores[nombre] || '#cccccc';
  }

  getMarcas_cohes() {
    this.carsService.getMarcas_all().subscribe({
      next: (res: any[]) => {
        this.generalService.loadingDismiss();
        this.opcionesBase = (res || [])
          .map((marca) => ({
            label: marca.nombre,
            key: (marca.key ?? marca.nombre ?? '').toString().toLowerCase(),
            imageUrl: marca.imageUrl,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        this.applyFilter();
      },
      error: (err) => {
        console.warn(err?.error?.message || 'Error al cargar marcas');
        this.opcionesBase = [];
        this.applyFilter();
      },
    });
  }

  getMarcas_motos() {
    this.motosService.getMarcas_all().subscribe({
      next: (res: any[]) => {
        this.generalService.loadingDismiss();
        this.opcionesBase = (res || [])
          .map((marca) => ({
            label: marca.nombre,
            key: (marca.key ?? marca.nombre ?? '').toString().toLowerCase(),
            imageUrl: marca.imageUrl,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        this.applyFilter();
      },
      error: (err) => {
        console.warn(err?.error?.message || 'Error al cargar marcas');
        this.opcionesBase = [];
        this.applyFilter();
      },
    });
  }

  getTipos_coches() {
    this.carsService.gatTiposVeiculos().subscribe({
      next: (res: any[]) => {
        this.generalService.loadingDismiss();
        this.opcionesBase = (res || [])
          .map((tipo) => ({
            label: tipo,
            key: tipo.toLowerCase().replace(/\s+/g, '-'),
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        this.applyFilter();
      },
      error: (err) => {
        console.warn(err?.error?.message || 'Error al cargar tipos');
        this.opcionesBase = [];
        this.applyFilter();
      },
    });
  }

  trackByKey = (_: number, item: any) => item?.key ?? item?.label ?? item;

  // normaliza (minúsculas y sin acentos) para comparar
  private normalize(v: any): string {
    return (v ?? '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }
}
