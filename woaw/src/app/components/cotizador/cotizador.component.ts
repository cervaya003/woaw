import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { GeneralService } from '../../services/general.service';
import { ContactosService } from './../../services/contactos.service';

@Component({
  selector: 'app-cotizador',
  templateUrl: './cotizador.component.html',
  styleUrls: ['./cotizador.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CotizadorComponent implements OnInit {
  @Input() coche: any;
  @Input() versionNuevo: string | null = null;
  @Input() precioNuevo: number | null = null;

  precio = 0;
  version: string = '';
  enganchePercent = 10;
  enganche = 0;
  plazo = 0;
  plazoMaximo = 0;
  edadValida = true;
  tasaAnual = 0.1499;
  mensajeErrorEnganche: string = '';
  disableBtn: boolean = false;
  engancheMinimoPercent = 10;

  constructor(
    public contactosService: ContactosService,
    private generalService: GeneralService
  ) { }

  ngOnInit() {
    // console.log(this.coche);
    const tipoVehiculo = this.coche?.vehiculo?.toLowerCase() || '';
    // console.log(tipoVehiculo);
    const año = this.coche?.anio;
    const añoActual = new Date().getFullYear();

    if (!año || año < 2016 || año > añoActual) {
      this.edadValida = false;
      return;
    }
    const tipo = this.coche?.tipoVenta?.toLowerCase() ?? '';

    if (tipoVehiculo === 'moto') {
      this.precio = this.coche.precio ?? 0;
      // console.log(this.precio);
      if (this.precio > 200000) {
        this.engancheMinimoPercent = 10;
        this.tasaAnual = tipo === 'nuevo' ? 0.1349 : 0.1499;
      } else if (this.precio > 75000 && this.precio <= 200000) {
        this.engancheMinimoPercent = 10;
        this.tasaAnual = tipo === 'nuevo' ? 0.1749 : 0.1799;
      } else if (this.precio <= 75000) {
        this.engancheMinimoPercent = 20;
        this.tasaAnual = tipo === 'nuevo' ? 0.3399 : 0.3399;
      }
    } else {
      this.precio = this.precioNuevo ?? this.coche.version?.[0]?.Precio ?? 0;
      this.version = this.versionNuevo ?? this.coche.version?.[0]?.Name ?? '';
      this.engancheMinimoPercent = tipo === 'nuevo' ? 10 : 15;
      this.tasaAnual = tipo === 'nuevo' ? 0.1349 : 0.1499;
    }
    this.enganchePercent = this.engancheMinimoPercent;

    const tablaPlazos: { [año: number]: number } = {
      2025: 120,
      2024: 108,
      2023: 96,
      2022: 84,
      2021: 72,
      2020: 60,
      2019: 60,
      2018: 48,
      2017: 36,
      2016: 24,
    };

    this.plazoMaximo = tablaPlazos[año] ?? 0;
    this.plazo = this.plazoMaximo;
    this.calcularEnganche();
  }

  onEngancheChange(valor: number) {
    this.disableBtn = true;
    this.mensajeErrorEnganche = '';
    this.enganchePercent = valor;
    this.calcularEnganche();
  }

  onPlazoChange(meses: number) {
    this.plazo = meses;
  }

  getInputValueAsNumber(event: Event): number {
    return (event.target as HTMLInputElement).valueAsNumber;
  }

  get plazosDisponibles(): number[] {
    const pasos = [12, 24, 36, 48, 60, 72, 84, 96, 108, 120];
    return pasos.filter((p) => p <= this.plazoMaximo);
  }

  calcularEnganche() {
    this.enganche = Math.round(this.precio * (this.enganchePercent / 100));
    this.disableBtn = true;
  }

  calcularMensualidad(plazo: number): number {
    const montoFinanciar = this.precio - this.enganche;
    const años = plazo / 12;
    const extra = Math.max(0, años - 5);
    let tasaAjustada = this.tasaAnual + extra * 0.0025;

    if (this.enganchePercent > 30) {
      tasaAjustada -= 0.01;
    }

    const i = tasaAjustada / 12;
    const n = plazo;

    if (i > 0) {
      const factor = Math.pow(1 + i, n);
      return (montoFinanciar * i * factor) / (factor - 1);
    } else {
      return montoFinanciar / n;
    }
  }

  get engancheMinimo(): number {
    return this.precio * (this.engancheMinimoPercent / 100);
  }


  get engancheMaximo(): number {
    return this.precio * 0.9;
  }

  onEngancheManualChange(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    const min = this.engancheMinimo;
    const max = this.engancheMaximo;
    if (value < min) {
      this.disableBtn = false;
      this.mensajeErrorEnganche = `El enganche no puede ser menor al ${this.engancheMinimoPercent
        }% ($${min.toLocaleString()})`;
    } else if (value > max) {
      this.disableBtn = false;
      this.mensajeErrorEnganche = `El enganche no puede ser mayor al 90% ($${max.toLocaleString()})`;
    } else {
      this.disableBtn = true;
      this.mensajeErrorEnganche = '';
      this.enganche = Math.round(value);
      const porcentaje = (value / this.precio) * 100;
      this.enganchePercent = Math.round(porcentaje);
      this.calcularEnganche();
    }
  }

  getTasa(plazo: number): number {
    const tipoVehiculo = this.coche?.vehiculo?.toLowerCase() || '';
    const tipoVenta = this.coche?.tipoVenta?.toLowerCase() || '';
    const precio = this.precio;
    const enganche = this.enganchePercent;

    let tasaBase = 0;

    if (tipoVehiculo === 'moto') {
      // Menos de 75k
      if (precio < 75000 && enganche >= 20) {
        tasaBase = 0.3399;
      }
      // Entre 75k y 200k
      else if (precio >= 75000 && precio <= 200000 && enganche >= 10) {
        tasaBase = tipoVenta === 'nuevo' ? 0.1749 : 0.1799;
      }
      // Más de 200k
      if (precio > 200000) {
        tasaBase = tipoVenta === 'nuevo' ? 0.1349 : 0.1499;
      }
      // if (precio > 200000 && enganche < 30) {
      //   tasaBase = tipoVenta === 'nuevo' ? 0.1349 : 0.1499;
      // }
      // if (precio > 200000 && enganche >= 30) {
      //   tasaBase = tipoVenta === 'nuevo' ? 0.1249 : 0.1399;
      // }
    } else {
      // Autos: tasa base general
      const años = plazo / 12;
      const extra = Math.max(0, años - 5);
      tasaBase = this.tasaAnual + extra * 0.0025;

      if (enganche > 30) {
        tasaBase -= 0.01;
      }

      return tasaBase;
    }

    // Aplicar incremento también a MOTOS si el plazo > 60 meses
    const años = plazo / 12;
    const extra = Math.max(0, años - 5);
    tasaBase += extra * 0.0025;

    // Descuento por enganche > 30% (para ambos tipos)
    if (enganche > 30 && tipoVehiculo === 'auto') {
      tasaBase -= 0.01;
    }
    if (enganche > 30 && tipoVehiculo === 'moto' && precio > 200000) {
      tasaBase -= 0.01;
    }

    return tasaBase;
  }



  enviarCredito(): void {
    this.generalService.confirmarAccion(
      '¿Estás seguro de que deseas solicitar financiamiento para este vehículo?',
      'Solicitar financiamiento',
      () => {
        const datos = {
          coche: this.coche,
          precio: this.precio,
          version: this.version ?? 'SIN VERSIÓN',
          enganche: this.enganche,
          enganchePercent: this.enganchePercent,
          plazo: this.plazo,
          mensualidad: Math.round(this.calcularMensualidad(this.plazo)),
          tasa: this.getTasa(this.plazo),
        };

        this.contactosService.envio_solicitus_credito(datos);
      }
    );
  }
}
