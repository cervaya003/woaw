import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MenuController } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { GeneralService } from '../../services/general.service';
import { CarsService } from '../../services/cars.service';
import { ContactosService } from '../../services/contactos.service';
import { MotosService } from '../../services/motos.service';
import { ModalController } from '@ionic/angular';
import { PasosArrendamientoComponent } from '../../components/modal/pasos-arrendamiento/pasos-arrendamiento.component';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';


interface Marca {
  key: string;
  nombre: string;
  imageUrl: string;
  _id: string;
  tipo: string;
}

@Component({
  selector: 'app-arrendamiento',
  templateUrl: './arrendamiento.page.html',
  styleUrls: ['./arrendamiento.page.scss'],
  standalone: false,
})
export class ArrendamientoPage implements OnInit {
  @ViewChild('contenidoScroll', { static: false }) contenidoScroll!: IonContent;
  @ViewChild('infoArrendamiento') infoArrendamiento!: ElementRef;
  opciones: any[] = [];
  opcionesCamiones: any[] = [];
  modelos: any[] = [];
  mostrarModelos: boolean = false;
  mostrarMarcas: boolean = false;
  seleccionarMarcaForm: boolean = false;
  marcaSeleccionada: Marca | null = null;
  modeloSeleccionado: any = null;
  expandedCard: number | null = null;
  tipoSeleccionado: 'coches' | 'camiones' = 'coches';
  public dispositivo: string = '';
  public esDispositivoMovil: boolean = false;
  formArrendamiento!: FormGroup;
  modelosSeleccionados: any[] = [];
  modelosConVersiones: {
    modelo: any;
    versiones: any[];
    versionSeleccionada: any[];
  }[] = [];
  pasoActual: number = 1;


  constructor(
    private generalService: GeneralService,
    private carsService: CarsService,
    public contactosService: ContactosService,
    private modalCtrl: ModalController,
    private menuCtrl: MenuController,
    private fb: FormBuilder
  ) { }
  ngOnInit() {
    this.menuCtrl.close('menuLateral');
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
      this.dispositivo = tipo;
    });
    this.getMarcas_cohes();
    this.formArrendamiento = this.fb.group({
      nombre: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      tipoPersona: ['', Validators.required],
      // modelos: [[], Validators.required],
      // versiones: [[], Validators.required],
      plazo: ['', Validators.required],
    });
  }
  seleccionarMarca(marca: Marca): void {
    this.marcaSeleccionada = marca;
    this.expandedCard = null;
    // Scroll suave hacia el ancla
    const anchor = document.getElementById('top-seccion-arrendamiento-marcas');
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  confirmarArrendamiento(): void {
    if (!this.marcaSeleccionada) return;
    const marcaSel = this.marcaSeleccionada;
    const anio = new Date().getFullYear();
    const tipo = marcaSel.tipo;
    const marca = tipo === 'coche' ? marcaSel.key : marcaSel._id;

    this.mostrarModelos = false;

    this.carsService.GetModelosAll(marca, anio, tipo).subscribe({
      next: (data: any[]) => {
        this.seleccionarMarcaForm = false;
        let modelosFormateados: any[];
        this.pasoActual = 2;

        if (marcaSel.tipo === 'camion') {
          modelosFormateados = data.map((item) => ({
            ...item,
            modelo: item.nombre
          }));
        } else {
          modelosFormateados = data;
        }

        // console.log(modelosFormateados);
        this.modelos = modelosFormateados;
        this.mostrarModelos = true;
        // scrooooll
        setTimeout(() => {
          const anchor = document.getElementById('anchor-modelos');
          if (anchor) {
            anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      },
      error: (error) => {
        console.error('Error al obtener modelos:', error);
      },
    });
  }
  getMarcas_cohes() {
    this.carsService.GetMarcas(2025).subscribe({
      next: (res: any[]) => {
        // console.log(res);
        this.opciones = res.map((marca) => ({ ...marca, imagenValida: true, tipo: 'coche' }));
        this.GetMarcas_camiones();
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Error al cargar marcas';
      },
    });
  }
  GetMarcas_camiones() {
    this.carsService.GetMarcasCamiones().subscribe({
      next: (res: any[]) => {
        console.log(res);
        this.opcionesCamiones = res.map((marca) => ({ ...marca, imagenValida: true, tipo: 'camion' }));
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Error al cargar marcas';
      },
    });
  }
  regresar() {
    this.mostrarModelos = false;
    this.seleccionarMarcaForm = false;
    this.mostrarMarcas = true;
    this.modeloSeleccionado = null;
    this.pasoActual = 1;
    this.formArrendamiento.reset();
    this.modelosSeleccionados = [];
    this.modelosConVersiones = [];
    setTimeout(() => {
      const anchor = document.getElementById('anchor-modelos');
      if (anchor) {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }
  async seleccionarModelo(modelo: any) {
    this.modeloSeleccionado = modelo;
    setTimeout(async () => {
      const anchor = document.getElementById(
        'top-seccion-arrendamiento-modelo'
      );
      if (anchor && this.contenidoScroll) {
        const rect = anchor.getBoundingClientRect();
        const scrollElement = await this.contenidoScroll.getScrollElement();

        const scrollY =
          rect.top + scrollElement.scrollTop - window.innerHeight / 2.5;

        this.contenidoScroll.scrollToPoint(0, scrollY, 500);
      }
    }, 100);
  }
  toggleCard(index: number) {
    this.expandedCard = this.expandedCard === index ? null : index;
  }
  async mostrarInfoArrendamiento() {
    this.infoArrendamiento.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.mostrarModelos = true;
    this.seleccionarMarcaForm = true
  }
  cambiarTipo(tipo: 'coches' | 'camiones') {
    this.tipoSeleccionado = tipo;
    this.marcaSeleccionada = null;
  }
  onModelosChange(event: any): void {
    this.modelosSeleccionados = event.detail.value || [];

    this.modelosConVersiones = [];
    const anio = new Date().getFullYear();
    const marca = this.marcaSeleccionada?.key ?? this.marcaSeleccionada?._id;

    if (!marca) {
      console.warn('No se ha seleccionado ninguna marca válida.');
      return;
    }

    // Si es camión, saltar versiones
    if (this.tipoSeleccionado === 'camiones') {
      this.modelosConVersiones = this.modelosSeleccionados.map((modelo) => ({
        modelo,
        versiones: [],
        versionSeleccionada: [] // Se queda vacío, pero no se usará
      }));
      return;
    }

    // Si es coche, cargar versiones normalmente
    this.modelosSeleccionados.forEach((modelo) => {
      this.carsService.GetVersiones(anio, marca, modelo.modelo).subscribe({
        next: (versiones) => {
          this.modelosConVersiones.push({
            modelo,
            versiones,
            versionSeleccionada: []
          });
        },
        error: (err) => {
          console.error('Error al obtener versiones de', modelo.modelo, err);
        }
      });
    });
  }
  enviarSolicitud(tipo: 'Wh' | 'Email') {
    const marca = this.marcaSeleccionada?.key ?? this.marcaSeleccionada?._id;

    if (!marca) {
      this.generalService.alert('Selecciona una Marca', 'Selecciona una marca.', 'warning');
      return;
    }
    if (this.formArrendamiento.invalid) {
      this.generalService.alert('Error al guardar los datos', 'Completa todos los campos obligatorios.', 'warning');
      return;
    }
    if (this.modelosConVersiones.length === 0) {
      this.generalService.alert('Selecciona un modelo', 'Debes seleccionar al menos un modelo.', 'warning');
      return;
    }
    // Validar versiones solo si es coche
    if (this.tipoSeleccionado === 'coches') {
      const modelosInvalidos = this.modelosConVersiones.filter(
        item =>
          !Array.isArray(item.versionSeleccionada) ||
          item.versionSeleccionada.length === 0
      );

      if (modelosInvalidos.length > 0) {
        const modelosFaltantes = modelosInvalidos.map(item => item.modelo).join(', ');
        this.generalService.alert('Faltan versiones', `Selecciona al menos una versión para los modelos: ${modelosFaltantes}`, 'warning');
        return;
      }
    }
    // 📦 Construir el array de modelos con versiones seleccionadas
    const vehiculos = this.modelosConVersiones.map(item => ({
      modelo: item.modelo,
      versiones: item.versionSeleccionada
    }));

    // 🎯 Armar el body como JSON normal
    const body = {
      marca: marca,
      nombre: this.formArrendamiento.value.nombre,
      correo: this.formArrendamiento.value.correo,
      tipoPersona: this.formArrendamiento.value.tipoPersona,
      plazo: this.formArrendamiento.value.plazo,
      vehiculos: vehiculos
    };
    if (tipo === 'Email') {
      this.Envia_email(body);
    } else if (tipo === 'Wh') {
      this.Arrendamiento_enviarPorWhatsApp(body);
    }
  }
  Envia_email(body: any) { // Confirmar envío
    this.generalService.confirmarAccion(
      '¿Deseas enviar estos datos?',
      '¿Estás seguro?',
      async () => {
        await this.generalService.loading('Enviando Email...');
        this.contactosService.Enviar_Datos_email(body).subscribe({
          next: (ret) => {
            console.log('✅ Email enviado con éxito', ret);
            this.generalService.loadingDismiss();
            this.generalService.alert(
              '¡Datos enviados!',
              'Hemos recibido tu solicitud. Revisa tu correo para más información.',
              'success'
            );

            this.formArrendamiento.reset();
            this.modelosSeleccionados = [];
            this.modelosConVersiones = [];
          },
          error: (err) => {
            console.error('❌ Error al enviar email', err);
            this.generalService.loadingDismiss();
          }
        });
      }
    );
  }
  Arrendamiento_enviarPorWhatsApp(body: any) {
    this.contactosService.Arrendamiento_enviarPorWhatsApp(body);
  }
  async mostrarInfoArrendamiento_XD() {
    let modal;
    if (this.dispositivo === 'telefono') {
      modal = await this.modalCtrl.create({
        component: PasosArrendamientoComponent,
        breakpoints: [0, 0.7, 1],
        cssClass: 'modal-perfil',
        initialBreakpoint: 0.7,
        handle: true,
        backdropDismiss: true,
        showBackdrop: true,
      });
    } else {
      modal = await this.modalCtrl.create({
        component: PasosArrendamientoComponent,
        backdropDismiss: true,
        showBackdrop: true,
        cssClass: 'modal-consentimiento',
      });
    }

    await modal.present();
  }
  selecionaMarca() {
    this.generalService.alert('Selecciona una marca', 'Para continuar selecciona una marca.', 'info');
  }
}
