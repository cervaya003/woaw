import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AbstractControl, ValidatorFn, ValidationErrors, FormGroup, } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AlertController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { GeneralService } from '../../../services/general.service';
import { CarsService } from '../../../services/cars.service';
import { MotosService } from '../../../services/motos.service';

@Component({
  selector: 'app-precentacion',
  templateUrl: './precentacion.component.html',
  styleUrls: ['./precentacion.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PrecentacionComponent implements OnInit {

  @Input() tipo: string = 'all';
  @Input() status: boolean = true;
  autosNuevos: any[] = [];
  autosSeminuevos: any[] = [];
  autosUsados: any[] = [];
  misMotos: any[] = [];
  Dispositivo: 'telefono' | 'tablet' | 'computadora' = 'computadora';
  public conUsados: number = 0;
  public conSeminuevos: number = 0;
  public conNuevos: number = 0;
  public conMotos: number = 0;

  durUsados = '400s';
  durSemis = '400s';
  durNuevos = '400s';


  constructor(
    public carsService: CarsService,
    public generalService: GeneralService,
    public motosService: MotosService,
    private router: Router
  ) { }

  ngOnInit() {
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.Dispositivo = tipo;
    });
    this.getCarsNews();
    this.getCarsSeminuevos();
    this.getCarsUsados();
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
        this.autosNuevos = autosAleatorios;
      },
      error: (err) => {
        const mensaje = err?.error?.message || 'Ocurrió un error inesperado';
        this.generalService.alert('Error de Conexión', mensaje);
      },
    });
  }
  precioDe(a: any): number | null {
    return a?.version?.[0]?.Precio ?? a?.precio ?? null;
  }
  getCarsSeminuevos() {
    this.carsService.getCarsSeminuevos().subscribe({
      next: (res: any) => {
        this.conSeminuevos = res.contador;
        const autos = res?.coches || [];
        const autosAleatorios = [...autos].sort(() => Math.random() - 0.5);
        this.autosSeminuevos = autosAleatorios;
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
        this.autosUsados = autosAleatorios;
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
  duplicar<T>(arr: T[]): T[] {
    if (!arr || arr.length === 0) return [];
    return [...arr, ...arr];
  }
}
