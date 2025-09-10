import { Component, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { GeneralService } from '../../../services/general.service';
import { CamionesService } from '../../../services/camiones.service';
import { ListComponent } from '../../../components/filtos/list/list.component';
import { PopoverController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { ViewChild } from '@angular/core';

interface Camion {
  marca: string;
  modelo: string;
  anio: number;
  tipo: string;
  precio: number;
  imagen: string;
  tipoCamion: string;
}

@Component({
  selector: 'app-mis-camiones',
  templateUrl: './mis-camiones.page.html',
  styleUrls: ['./mis-camiones.page.scss'],
  standalone: false,
})
export class MisCamionesPage implements OnInit {
  esDispositivoMovil: boolean = false;
  camionesStorage: any[] = [];
  filtros = [
    { label: '$', tipo: 'precio' },
    // { label: 'Color', tipo: 'color' },
    // { label: 'Año', tipo: 'anio' },
    { label: 'Marca', tipo: 'marca' },
    { label: 'Tipo', tipo: 'tipoCamion' } // Agregamos filtro por tipo de camión
  ];

  @ViewChild('pageContent') content!: IonContent;

  ordenActivo: string | null = null;

  public totalCamiones: number = 0;

  // ## ----- ☢️☢️☢️☢️
  filtrosAplicados: any = {
    precio: null,
    anio: null,
    color: null,
    marca: null,
    tipoCamion: null // Nuevo filtro para tipos de camión
  };
  terminoBusqueda: string = '';

  public isLoggedIn: boolean = false;
  public MyRole: string | null = null;

  camionesFavoritosIds: Set<string> = new Set();

  // #---
  paginaActual = 1;
  itemsPorPagina!: number;
  totalPaginas = 1;
  paginas: number[] = [];
  camionesPaginados: any[] = [];
  // #---

  showSplash: boolean = true;

  public idsMisCamiones: string[] = [];

  public camionesFiltrados: any[] = [];

  constructor(
    public generalService: GeneralService,
    private popoverCtrl: PopoverController,
    public camionesService: CamionesService, // Cambiamos a CamionesService
    private modalCtrl: ModalController,
    private router: Router,
    private route: ActivatedRoute,
    private menuCtrl: MenuController,
  ) { }

  ngOnInit() {
    this.menuCtrl.close('menuLateral');
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });
    this.getCamionesMay();

    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });

    this.generalService.tipoRol$.subscribe((rol) => {
      this.MyRole = rol;
    });

    this.generalService.valorGlobal$.subscribe((valor) => {
      this.itemsPorPagina = valor;
    });
    this.misCamiones();
  }

  async misCamiones() {
    if (!this.isLoggedIn) {
      return;
    }
    // Utilizamos el nuevo servicio para camiones
    this.camionesService.misCamionesId().subscribe({
      next: (res: any) => {
        if (res && Array.isArray(res.vehicleIds) && res.vehicleIds.length > 0) {
          this.idsMisCamiones = res.vehicleIds;
        } else {
          this.idsMisCamiones = [];
        }
      },
      error: (err) => {
        const mensaje =
          err?.error?.message || 'Error al obtener tus vehículos.';
        if (mensaje === 'No se encontraron vehículos para este usuario') {
          this.idsMisCamiones = [];
        } else {
          console.warn(mensaje);
        }
      },
    });
  }

 getCamionesMay() {
  console.log("estoy aqui")
  this.camionesService.getMyCamiones().subscribe({
    next: (res: any) => {
      // Procesar los camiones para añadir precioDesde
      this.camionesStorage = res.map((camion: any) => {
        let precioDesde = 0;
        
        // Obtener precio desde versiones si existen
        if (camion.version && Array.isArray(camion.version) && camion.version.length > 0) {
          const precios = camion.version
            .map((v: any) => parseFloat(v.Precio || v.precio || 0))
            .filter((p: any) => !isNaN(p) && p > 0);
            
          if (precios.length > 0) {
            precioDesde = Math.min(...precios);
          }
        }
        
        // Si no hay precio en versiones, usar precio directo
        if (precioDesde === 0 && camion.precio) {
          precioDesde = parseFloat(camion.precio);
        }
        
        // Devolver el camión con precioDesde añadido
        return {
          ...camion,
          precioDesde: precioDesde
        };
      });
      
      console.log(this.camionesStorage);
      this.totalCamiones = this.camionesStorage.length;
      this.getCamionesFavoritos();
      this.calcularPaginacion();
    },
    error: (err) => {
      console.log("revision error");
      const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
      console.error('Error al cargar camiones:', mensaje);
    },
  });
}

  getCamionesFavoritos() {
    this.camionesService.getCamionesFavoritos().subscribe({
      next: (res: any) => {
        const vehicleIds = res.vehicles
          .filter((vehicle: any) => {
            // Si tienes forma de identificar solo los camiones favoritos, filtra aquí
            return vehicle.tipo === 'camion' || vehicle.categoria === 'camion';
          })
          .map((vehicle: any) => vehicle.vehicleId);
        this.camionesFavoritosIds = new Set(vehicleIds);
        this.aplicarFiltros();
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        console.error('Error al cargar favoritos:', mensaje);
      },
    });
  }

  // ## ----- Ver descripción de camión
  async ficha(camion: any) {
    this.router.navigate(['/ficha', camion._id]);
  }

  doRefresh(event: any) {
    this.getCamionesMay();
    this.filtrosAplicados = {};

    setTimeout(() => {
      event.target.complete();
    }, 1500);
  }

  // ## ----- Filtro ☢️☢️☢️☢️
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
      // Se seleccionó "Quitar filtro"
      this.filtrosAplicados[tipo] = null;
    } else {
      this.filtrosAplicados[tipo] = data;
    }

    this.aplicarFiltros();
  }

  // ## ----- ☢️☢️☢️☢️
  aplicarFiltros() {
    let camionesFiltrados = [...this.camionesStorage];

    const { precio, anio, color, marca, tipoCamion } = this.filtrosAplicados;

    if (precio) {
      camionesFiltrados = camionesFiltrados.filter(
        (camion) =>
          camion.precioDesde >= precio.rango[0] &&
          camion.precioDesde <= precio.rango[1]
      );
    }

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

    if (color) {
      camionesFiltrados = camionesFiltrados.filter(
        (camion) => camion.color?.toLowerCase() === color.label.toLowerCase()
      );
    }

    if (marca) {
      camionesFiltrados = camionesFiltrados.filter(
        (camion) => camion.marca.toLowerCase() === marca.label.toLowerCase()
      );
    }

    if (tipoCamion) {
      camionesFiltrados = camionesFiltrados.filter(
        (camion) => camion.tipoCamion?.toLowerCase() === tipoCamion.label.toLowerCase()
      );
    }

    this.camionesFiltrados = camionesFiltrados;
    this.totalPaginas = Math.ceil(camionesFiltrados.length / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.camionesPaginados = camionesFiltrados.slice(0, this.itemsPorPagina);
  }

  // ## ----- Calculación de paginación 20
  calcularPaginacion() {
    this.totalPaginas = Math.ceil(
      this.camionesStorage.length / this.itemsPorPagina
    );
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.mostrarPagina(this.paginaActual);
  }

 mostrarPagina(pagina: number) {
  this.paginaActual = pagina;
  const inicio = (pagina - 1) * this.itemsPorPagina;
  const fin = inicio + this.itemsPorPagina;
  
  // Usar camionesFiltrados si hay filtros aplicados
  const base = this.camionesFiltrados.length > 0 ? this.camionesFiltrados : this.camionesStorage;
  this.camionesPaginados = base.slice(inicio, fin);
}

  async agregarAFavoritos(camionId: string) {
    if (!this.isLoggedIn) {
      this.router.navigate(['/inicio']);
      this.generalService.alert(
        'Inicia sesión',
        'Por favor, inicia sesión para continuar.',
        'warning'
      );
      return;
    }

    // Mostrar spinner
    await this.generalService.loading('Agregando a favoritos...');

    this.camionesService.agregarFavorito(camionId).subscribe({
      next: async () => {
        this.getCamionesMay();
        await this.generalService.loadingDismiss();
      },
      error: async (err) => {
        await this.generalService.loadingDismiss();
        const mensaje =
          err.error?.message ||
          'No se pudo agregar el camión a favoritos. Intenta más tarde.';
        await this.generalService.alert('Error', mensaje, 'danger');
      },
    });
  }

  ordenarCamiones(criterio: string) {
    this.ordenActivo = criterio;

    const base = this.camionesFiltrados.length
      ? this.camionesFiltrados
      : [...this.camionesStorage];

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
    this.filtrosAplicados = {};
    this.aplicarFiltros();
  }

  cambiarPagina(pagina: number) {
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
    const rango = 1; // ±2 alrededor

    if (total <= 2) return this.paginas;

    const paginas: (number | string)[] = [];

    paginas.push(1);

    if (actual - rango > 2) paginas.push('...');
    for (
      let i = Math.max(2, actual - rango);
      i <= Math.min(total - 1, actual + rango);
      i++
    ) {
      paginas.push(i);
    }
    if (actual + rango < total - 1) paginas.push('...');
    paginas.push(total);

    return paginas;
  }

  filtrarPorBusqueda() {
    const termino = this.terminoBusqueda.trim().toLowerCase();

    // Si no hay texto, mostrar todos los camiones
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
      const versiones = (camion.version || []).map((v: any) => v.Name.toLowerCase()).join(' ');

      return (
        marca.includes(termino) ||
        modelo.includes(termino) ||
        anio.includes(termino) ||
        tipoCamion.includes(termino) ||
        versiones.includes(termino)
      );
    });

    this.totalPaginas = Math.ceil(filtrados.length / this.itemsPorPagina);
    this.paginas = Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
    this.paginaActual = 1;
    this.camionesPaginados = filtrados.slice(0, this.itemsPorPagina);
  }
}