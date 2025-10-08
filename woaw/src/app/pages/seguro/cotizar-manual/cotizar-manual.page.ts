import { Component, OnInit } from '@angular/core';
import { PopoverController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CarsService } from '../../../services/cars.service';
import { GeneralService } from '../../../services/general.service';
import { SeguroService } from '../../../services/seguro.service';

import { Location } from '@angular/common';
import { AfterViewInit, ElementRef, QueryList, ViewChildren, ViewChild } from '@angular/core';

@Component({
  selector: 'app-cotizar-manual',
  templateUrl: './cotizar-manual.page.html',
  styleUrls: ['./cotizar-manual.page.scss'],
  standalone: false
})
export class CotizarManualPage implements OnInit {
  mostrar_spinnet: boolean = false;
  form: FormGroup;
  public tipo: string = '';
  anios: number[] = [];
  public marcador: 1 | 2 | 3 | 4 = 1;

  constructor(
    private popoverCtrl: PopoverController,
    private alertCtrl: AlertController,
    private router: Router,
    private generalService: GeneralService,
    public carsService: CarsService,
    private fb: FormBuilder,
    private seguros: SeguroService,
    private location: Location
  ) {
    this.form = this.fb.group({
      marca: ['', Validators.required],
      modelo: ['', Validators.required],
      version: ['', Validators.required],
      anio: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.anios = this.buildAnios(1960);
    this.getStoarage();
  }
  private async getStoarage() {
    let v = localStorage.getItem('tipo-cotizar-manual');
    if (v) {
      this.tipo = v;
    }
  }
  public atras() {
    if (this.marcador === 2) {
      this.marcador = 1;
      this.form.removeControl('nombre');
      this.form.removeControl('correo');
      this.form.removeControl('fechaNacimiento');
      this.form.removeControl('codigoPostal');
      this.form.removeControl('estadoCivil');
    } else if (this.marcador === 3) {
      this.marcador = 2;
    } else if (this.marcador === 4) {
      this.marcador = 3;
    } else {
      this.location.back();
    }
  }
  private buildAnios(minYear: number, maxYear: number = new Date().getFullYear()): number[] {
    const out: number[] = [];
    for (let y = maxYear; y >= minYear; y--) out.push(y);
    return out;
  }
  public siguiente() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.marcador === 1) {
      this.marcador = 2;
      this.form.addControl('nombre', this.fb.control('', [Validators.required, Validators.minLength(3)]));
      this.form.addControl('correo', this.fb.control('', [Validators.required, Validators.minLength(3)]));
      this.form.addControl('fechaNacimiento', this.fb.control('', [Validators.required, Validators.minLength(3)]));
      this.form.addControl('codigoPostal', this.fb.control('', [Validators.required, Validators.minLength(3)]));
      this.form.addControl('estadoCivil', this.fb.control('', [Validators.required, Validators.minLength(3)]));
    } else if (this.marcador === 2) {
      this.marcador = 3;
    }
  }
  public regresar() {
    if (this.marcador === 2) {
      this.marcador = 1;
      this.form.removeControl('nombre');
      this.form.removeControl('correo');
      this.form.removeControl('fechaNacimiento');
      this.form.removeControl('codigoPostal');
      this.form.removeControl('estadoCivil');
    } else if (this.marcador === 3) {
      this.marcador = 2;
    } else if (this.marcador === 4) {
      this.marcador = 3;
    }
  }
  public enviarDatos(tipo: 'correo' | 'whatsapp') {
    if (this.form.invalid) {
      this.generalService.alert(
        'Por favor, completa todos los campos antes de continuar.',
        'Formulario incompleto',
        'warning'
      );
      return;
    }

    this.mostrar_spinnet = true;

    const data = {
      tipo_envio: tipo,
      tipo: this.tipo || 'auto',
      ...this.form.value,
    };
    this.seguros.cotizaManual(data).subscribe({
      next: (resp) => {
        setTimeout(() => {
          this.mostrar_spinnet = false;

          if (resp?.success || resp?.status === 200) {
            this.generalService.alert(
              `Tu solicitud fue enviada correctamente por ${tipo}.`,
              'Envío exitoso',
              'success'
            );

            this.marcador = 4;
          } else {
            this.generalService.alert(
              'Ocurrió un problema al enviar tus datos. Intenta nuevamente.',
              'Error en el envío',
              'danger'
            );
          }
        }, 2000);
      },
      error: (err) => {
        this.mostrar_spinnet = false;
        console.error('Error al enviar datos manuales:', err);
        this.generalService.alert(
          'No se pudo completar el envío. Verifica tu conexión o intenta más tarde.',
          'Error de red',
          'danger'
        );
      },
    });
  }





  trackByCov = (_: number, c: any) => c?.code || _;
  @ViewChildren('lista', { read: ElementRef })
  allSelects!: QueryList<ElementRef<HTMLElement>>;
  ngAfterViewInit() {
    const syncAll = () => this.syncPopoverWidths();
    syncAll();
    window.addEventListener('resize', syncAll);
  }
  syncPopoverWidths() {
    this.allSelects.forEach(ref => {
      const el = ref.nativeElement;
      const w = el.getBoundingClientRect().width;

      document.documentElement.style.setProperty('--pop-width', `${w}px`);
    });
  }


  // ----- MOSTRAR DATOS -----
  get resumen(): Array<{ label: string; value: string }> {
    const v = this.form?.value ?? {};
    return [
      { label: 'Marca', value: v.marca },
      { label: 'Modelo', value: v.modelo },
      { label: 'Versión', value: v.version },
      { label: 'Año', value: String(v.anio || '') },

      { label: 'Nombre', value: v.nombre },
      { label: 'Correo', value: v.correo },
      { label: 'Estado civil', value: this.mapEstadoCivil(v.estadoCivil) },
      { label: 'Fecha de nacimiento', value: this.formatFecha(v.fechaNacimiento) },
      { label: 'Código postal', value: v.codigoPostal }
    ];
  }
  private formatFecha(d: any): string {
    if (!d) return '';
    try {
      const date = new Date(d);
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yy = date.getFullYear();
      return `${dd}/${mm}/${yy}`;
    } catch { return String(d); }
  }
  private mapEstadoCivil(v: string): string {
    switch ((v || '').toLowerCase()) {
      case 'soltero': return 'Soltero(a)';
      case 'casado': return 'Casado(a)';
      case 'divorciado': return 'Divorciado(a)';
      default: return v || '';
    }
  }
}
