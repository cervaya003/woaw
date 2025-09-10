import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GeneralService } from '../../../services/general.service';
import { CarsService } from '../../../services/cars.service';
import { MotosService } from '../../../services/motos.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-principal',
  templateUrl: './principal.component.html',
  styleUrls: ['./principal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})

export class PrincipalComponent implements OnInit {
  @Input() tipo: string = 'all';
  @Input() status: boolean = true;
  autosNuevos: any[] = [];
  autosSeminuevos: any[] = [];
  autosUsados: any[] = [];
  misMotos: any[] = [];
  Dispositivo: 'telefono' | 'tablet' | 'computadora' = 'computadora';
  esDispositivoMovil: boolean = false;
  public conUsados: number = 0;
  public conSeminuevos: number = 0;
  public conNuevos: number = 0;
  public conMotos: number = 0;
  public img1: string = '';
  public img2: string = '';
  public img3: string = '';


  public isNative = Capacitor.isNativePlatform();

  constructor(
    public carsService: CarsService,
    public generalService: GeneralService,
    public motosService: MotosService,
    private router: Router
  ) { }

  ngOnInit() {
    this.generalService.dispositivo$.subscribe((tipo: 'telefono' | 'tablet' | 'computadora') => {
      this.Dispositivo = tipo;
    });
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
    });
    this.getCarsNews();
    this.getCarsSeminuevos();
    this.getCarsUsados();
    this.getMotos();
    this.cargaimagen(); 
  }

  ngAfterViewInit(): void {
    this.generalService.aplicarAnimacionPorScroll(
      '.carrusel-autos_minicartas'
    );
  }
  getCarsNews() {
    this.carsService.getCarsNews().subscribe({
      next: (res: any) => {
        this.conNuevos = res.contador;
        const autos = res?.coches || [];


        const autosAleatorios = [...autos].sort(() => Math.random() - 0.5);
        this.autosNuevos = autosAleatorios.slice(0, 5);

      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('Error de Conexión', mensaje);
      },
    });
  }
  getCarsSeminuevos() {
    this.carsService.getCarsSeminuevos().subscribe({
      next: (res: any) => {
        this.conSeminuevos = res.contador;
        const autos = res?.coches || [];
        const autosAleatorios = [...autos].sort(() => Math.random() - 0.5);
        this.autosSeminuevos = autosAleatorios.slice(0, 5);
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('Error de Conexión', mensaje);
      },
    });
  }
  getCarsUsados() {
    this.carsService.getCarsUsados().subscribe({
      next: (res: any) => {
        this.conUsados = res.contador;
        const autos = res?.coches || [];
        const autosAleatorios = [...autos].sort(() => Math.random() - 0.5);
        this.autosUsados = autosAleatorios.slice(0, 5);
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('Error de Conexión', mensaje);
      },
    });
  }
  getMotos() {
    if (this.tipo !== 'all') {
      return;
    }
    this.motosService.getMotos().subscribe({
      next: (res: any) => {
        console.log(res)
        this.conMotos = res.contador;
        const moto = res?.motos || []
        this.misMotos = moto.slice(0, 5);
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('Error de Conexión', mensaje);
      },
    });
  }
  verMas(url: string) {
    this.router.navigate([url]);
  }
  onCardClick(auto: any, event: Event): void {
    this.router.navigate(['/ficha', 'autos', auto._id]);
  }
  onCardClickM(moto: any, event: Event): void {
    this.router.navigate(['/ficha', 'motos', moto._id]);
  }
  async cargaimagen() {
    this.img1 = '/assets/autos/A1.png';
    this.img2 = '/assets/autos/A5.png';
    this.img3 = '/assets/autos/A3.png';
    this.generalService.addPreload(this.img1, 'image');
    this.generalService.addPreload(this.img2, 'image');
    this.generalService.addPreload(this.img3, 'image');
    try {
      await Promise.all([
        this.generalService.preloadHero(this.img1, 500),
        this.generalService.preloadHero(this.img2, 500),
        this.generalService.preloadHero(this.img3, 500),
      ]);
    } finally {
      // this.overlayLoaded = true;
    }
  }
}
