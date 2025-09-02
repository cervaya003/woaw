import { Component, OnInit, ViewChild } from '@angular/core';
import { MenuController, PopoverController, ModalController, IonContent } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { GeneralService } from '../../../services/general.service';
import { CamionesService } from '../../../services/camiones.service';
import { ListComponent } from '../../../components/filtos/list/list.component';

@Component({
  selector: 'app-todos',
  templateUrl: './todos.page.html',
  styleUrls: ['./todos.page.scss'],
  standalone: false
})
export class TodosPage implements OnInit {
  // Control de dispositivo
  esDispositivoMovil: boolean = false;
  
  // Datos de camiones
  camionesStorage: any[] = [];
  camionesFiltrados: any[] = [];
  camionesPaginados: any[] = [];
  totalCamiones: number = 0;
  
  // Filtros
  filtros = [
    { label: '$', tipo: 'precio' },
    { label: 'Marca', tipo: 'marca' },
    { label: 'Tipo', tipo: 'tipoCamion' }
  ];
  filtrosAplicados: any = {
    precio: null,
    anio: null,
    color: null,
    marca: null,
    tipoCamion: null
  };
  
  // Búsqueda
  terminoBusqueda: string = '';
  
  // Autenticación
  isLoggedIn: boolean = false;
  MyRole: string | null = null;
  
  // Favoritos
  camionesFavoritosIds: Set<string> = new Set();
  idsMisCamiones: string[] = [];
  
  // Paginación
  paginaActual = 1;
  itemsPorPagina!: number;
  totalPaginas = 1;
  paginas: number[] = [];
  
  // Ordenamiento
  ordenActivo: string | null = null;

  @ViewChild('pageContent') content!: IonContent;

  constructor(
    public generalService: GeneralService,
    private popoverCtrl: PopoverController,
    public camionesService: CamionesService,
    private modalCtrl: ModalController,
    private router: Router,
    private route: ActivatedRoute,
    private menuCtrl: MenuController,
  ) { }

  ngOnInit() {
    this.menuCtrl.close('menuLateral');
    
    // Configuración inicial
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });
    
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    
    this.generalService.tipoRol$.subscribe((rol) => {
      this.MyRole = rol;
    });
    
    this.generalService.valorGlobal$.subscribe((valor) => {
      this.itemsPorPagina = valor || 12;
    });
    
    // Cargar datos
    this.getCamionesAll();
    this.misCamiones();
  }

  async misCamiones() {
    if (!this.isLoggedIn) return;
    
    this.camionesService.misCamionesId().subscribe({
      next: (res: any) => {
        this.idsMisCamiones = (res && Array.isArray(res.vehicleIds)) ? res.vehicleIds : [];
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Error al obtener tus vehículos.';
        if (mensaje === 'No se encontraron vehículos para este usuario') {
          this.idsMisCamiones = [];
        } else {
          console.warn(mensaje);
        }
      }
    });
  }
 getCamionesAll() {
  this.camionesService.getAllCamiones().subscribe({
    next: (res: any) => {
      this.camionesStorage = res.camiones.map((camion: any) => {
        let precioDesde = 0;
        
        if (camion.version && Array.isArray(camion.version) && camion.version.length > 0) {
          const precios = camion.version
            .map((v: any) => parseFloat(v.Precio || v.precio || 0))
            .filter((p: any) => !isNaN(p) && p > 0);
            
          if (precios.length > 0) {
            precioDesde = Math.min(...precios);
          }
        }
        
        if (precioDesde === 0 && camion.precio) {
          precioDesde = parseFloat(camion.precio);
        }
        
        return {
          ...camion,
          precioDesde: precioDesde
        };
      });
      
      this.totalCamiones = this.camionesStorage.length;
      this.getCamionesFavoritos();
      this.calcularPaginacion();
    },
    error: (err) => {
      const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
      console.error('Error al cargar camiones:', mensaje);
    }
  });
}

  getCamionesFavoritos() {
    this.camionesService.getCamionesFavoritos().subscribe({
      next: (res: any) => {
        const vehicleIds = res.vehicles
          .filter((vehicle: any) => vehicle.tipo === 'camion' || vehicle.categoria === 'camion')
          .map((vehicle: any) => vehicle.vehicleId);
        this.camionesFavoritosIds = new Set(vehicleIds);
        this.aplicarFiltros();
      },
      error: (err) => {
        console.error('Error al cargar favoritos:', err?.error?.message || 'Ocurrió un error inesperado');
      }
    });
  }

  doRefresh(event: any) {
    this.getCamionesAll();
    this.filtrosAplicados = {
      precio: null,
      anio: null,
      color: null,
      marca: null,
      tipoCamion: null
    };
    
    setTimeout(() => event.target.complete(), 1500);
  }

  async mostrarOpciones(ev: Event, tipo: string) {
    const popover = await this.popoverCtrl.create({
      component: ListComponent,
      event: ev,
      translucent: true,
      componentProps: { tipo }
    });

    await popover.present();
    const { data } = await popover.onDidDismiss();

    this.filtrosAplicados[tipo] = data === null ? null : data;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let camionesFiltrados = [...this.camionesStorage];
    const { precio, anio, color, marca, tipoCamion } = this.filtrosAplicados;

    // Filtrar por precio
    if (precio) {
      camionesFiltrados = camionesFiltrados.filter(
        (camion) =>
          camion.precioDesde >= precio.rango[0] &&
          camion.precioDesde <= precio.rango[1]
      );
    }

    // Filtrar por año
    if (anio) {
      if (anio.anio === 2024) {
        camionesFiltrados = camionesFiltrados.filter((camion) => camion.anio >= 2024);
      } else if (anio.anio === 2020) {
        camionesFiltrados = camionesFiltrados.filter(
          (camion) => camion.anio >= 2020 && camion.anio <= 2023
        );
      } else if (anio.anio === 2010) {
        camionesFiltrados = camionesFiltrados.filter((camion) => camion.anio < 2020);
      }
    }

    // Filtrar por color
    if (color) {
      camionesFiltrados = camionesFiltrados.filter(
        (camion) => camion.color?.toLowerCase() === color.label.toLowerCase()
      );
    }

    // Filtrar por marca
    if (marca) {
      camionesFiltrados = camionesFiltrados.filter(
        (camion) => camion.marca.toLowerCase() === marca.label.toLowerCase()
      );
    }

    // Filtrar por tipo de camión
    if (tipoCamion) {
      camionesFiltrados = camionesFiltrados.filter(
        (camion) => camion.tipoCamion?.toLowerCase() === tipoCamion.label.toLowerCase()
      );
    }

    // Filtrar por precio
if (precio) {
  camionesFiltrados = camionesFiltrados.filter(
    (camion) =>
      camion.precioDesde >= precio.rango[0] &&
      camion.precioDesde <= precio.rango[1]
  );
}

    // Actualizar datos filtrados y paginación
    this.camionesFiltrados = camionesFiltrados;
    this.totalPaginas = Math.ceil(camionesFiltrados.length / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.paginaActual = 1;
    this.mostrarPagina(1);
  }

  calcularPaginacion() {
    this.totalPaginas = Math.ceil(this.camionesStorage.length / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.mostrarPagina(this.paginaActual);
  }

  mostrarPagina(pagina: number) {
    this.paginaActual = pagina;
    const inicio = (pagina - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    
    const base = this.camionesFiltrados.length > 0 ? this.camionesFiltrados : this.camionesStorage;
    this.camionesPaginados = base.slice(inicio, fin);
  }

  ordenarCamiones(criterio: string) {
    this.ordenActivo = criterio;
    const base = this.camionesFiltrados.length ? [...this.camionesFiltrados] : [...this.camionesStorage];

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

    this.camionesFiltrados = base;
    this.totalPaginas = Math.ceil(base.length / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.camionesPaginados = base.slice(0, this.itemsPorPagina);
  }

  resetearFiltros() {
    this.filtrosAplicados = {
      precio: null,
      anio: null,
      color: null,
      marca: null,
      tipoCamion: null
    };
    this.camionesFiltrados = [];
    this.calcularPaginacion();
  }

  cambiarPagina(pagina: number) {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    
    this.mostrarPagina(pagina);
    setTimeout(() => {
      this.content.scrollToTop(400);
    }, 100);
  }

  regresar() {
    this.router.navigate(['/home']);
  }

  esNumero(valor: any): valor is number {
    return typeof valor === 'number';
  }

  get paginasReducidas(): (number | string)[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;
    const rango = 1;

    if (total <= 2) return this.paginas;

    const paginas: (number | string)[] = [];
    paginas.push(1);

    if (actual - rango > 2) paginas.push('...');
    for (let i = Math.max(2, actual - rango); i <= Math.min(total - 1, actual + rango); i++) {
      paginas.push(i);
    }
    if (actual + rango < total - 1) paginas.push('...');
    if (total > 1) paginas.push(total);

    return paginas;
  }

  filtrarPorBusqueda() {
    const termino = this.terminoBusqueda.trim().toLowerCase();
    if (!termino) {
      this.aplicarFiltros();
      return;
    }

    const camionesBase = this.camionesFiltrados.length ? this.camionesFiltrados : this.camionesStorage;
    const filtrados = camionesBase.filter((camion) => {
      const marca = camion.marca?.toLowerCase() || '';
      const modelo = camion.modelo?.toLowerCase() || '';
      const anio = String(camion.anio || '');
      const tipoCamion = camion.tipoCamion?.toLowerCase() || '';
      const versiones = (camion.version || []).map((v: any) => v.Name?.toLowerCase() || '').join(' ');

      return (
        marca.includes(termino) ||
        modelo.includes(termino) ||
        anio.includes(termino) ||
        tipoCamion.includes(termino) ||
        versiones.includes(termino)
      );
    });

    this.camionesFiltrados = filtrados;
    this.totalPaginas = Math.ceil(filtrados.length / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.paginaActual = 1;
    this.mostrarPagina(1);
  }
}