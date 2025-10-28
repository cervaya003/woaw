import { Component, OnInit } from '@angular/core';
import { PopoverController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CarsService } from '../../../services/cars.service';
import { GeneralService } from '../../../services/general.service';
import { ContactosService } from '../../../services/contactos.service';
import { SeguroService } from '../../../services/seguro.service';
import { ChangeDetectorRef } from '@angular/core';
import { Location } from '@angular/common';
import { AfterViewInit, ElementRef, QueryList, ViewChildren, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MotosService } from "../../../services/motos.service";

type SeguroData = {
  tipo: string;
  marca: string;
  modelo: string;
  version: string;
  anio: string | number;
  nombre: string;
  correo: string;
  estadoCivil: string;
  fechaNacimiento: string;
  codigoPostal: string | number;
};

interface Marca {
  key: string;
  nombre: string;
  imageUrl: string;
}


@Component({
  selector: 'app-cotiza-moto-camion-ert',
  templateUrl: './cotiza-moto-camion-ert.page.html',
  styleUrls: ['./cotiza-moto-camion-ert.page.scss'],
  standalone: false,
})
export class CotizaMotoCamionErtPage implements OnInit {

  mostrar_spinnet: boolean = false;
  form: FormGroup;
  public tipo_vehiculo: string = '';
  anios: number[] = [];
  public marcador: 1 | 2 | 3 | 4 = 1;

  public maxFechaNacimiento: string = this.toISODateOnly(new Date());
  public minNacimiento = '1900-01-01';
  public maxAdulto = this.toISODateOnly(this.fechaMenosAnios(new Date(), 18));
  public fechaNacimientoLabel = '';


  modelos: any[] = [];
  public selectedMarcaNombre: string = '';
  marcasCamionesERT: any[] = [];
  marcasMotos: any[] = [];

  OTRO_MODELO = '__OTRO_MODELO__';
  showOtroModelo = false;


  public tipoDispocitivo: 'computadora' | 'telefono' | 'tablet' = 'computadora';

  constructor(
    private popoverCtrl: PopoverController,
    private alertCtrl: AlertController,
    private router: Router,
    private generalService: GeneralService,
    public carsService: CarsService,
    private fb: FormBuilder,
    private seguros: SeguroService,
    private location: Location,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private contactosService: ContactosService,
    private motosService: MotosService,
  ) {
    this.form = this.fb.group({
      marca: ['', Validators.required]
    });
  }
  ngOnInit() {
    this.anios = this.buildAnios(1960);
    this.getStoarage();
    this.GetMarcas();
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.tipoDispocitivo = tipo;
    });
  }
  private async getStoarage() {
    let v = localStorage.getItem('tipo-cotizar-manual');
    if (v) {
      this.tipo_vehiculo = v;
    }
    // this.route.paramMap.subscribe(params => {
    //   this.tipo = params.get('tipo') || '';
    //   console.log('Tipo recibido por ruta:', this.tipo);
    // });
  }
  public atras() {
    if (this.marcador === 2) {
      this.marcador = 1;
      this.form.removeControl('nombre');
      this.form.removeControl('correo');

      this.form.removeControl('fechaNacimiento');
      this.form.removeControl('codigoPostal');
      this.form.removeControl('estadoCivil');

      this.form.removeControl('modelo');
      this.form.removeControl('version');
      this.form.removeControl('anio');
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
      if (this.tipo_vehiculo !== 'ERT') {
        this.GetModelos(this.form.get('marca')?.value);
      }
      this.marcador = 2;
      this.form.addControl('modelo', this.fb.control('', [Validators.required]));
      this.form.addControl('version', this.fb.control('', [Validators.required, Validators.minLength(3)]));
      this.form.addControl('anio', this.fb.control('', [Validators.required, Validators.minLength(3)]));
      this.form.addControl('codigoPostal', this.fb.control('', [Validators.required, Validators.minLength(3)]));
    } else if (this.marcador === 2) {
      this.marcador = 3;
      this.form.addControl('nombre', this.fb.control('', [Validators.required, Validators.minLength(3)]));
      this.form.addControl('correo', this.fb.control('', [Validators.required, Validators.minLength(3)]));
      this.form.addControl(
        'fechaNacimiento',
        this.fb.control('', [Validators.required, this.mayorDeEdadValidator(18)])
      );
      this.form.addControl('estadoCivil', this.fb.control('', [Validators.required, Validators.minLength(3)]));
    } else if (this.marcador === 3) {
      if (this.form.get('fechaNacimiento')?.hasError('underage')) {
        this.generalService.alert('Debes ser mayor de 18 años para continuar.', 'Edad no válida', 'warning');
        return;
      }
      this.marcador = 4;
    }
  }
  public regresar() {
    if (this.marcador === 2) {
      this.marcador = 1;
      this.form.removeControl('modelo');
      this.form.removeControl('version');
      this.form.removeControl('anio');
      this.form.removeControl('codigoPostal');
    } else if (this.marcador === 3) {
      this.marcador = 2;
      this.form.removeControl('nombre');
      this.form.removeControl('correo');
      this.form.removeControl('fechaNacimiento');
      this.form.removeControl('estadoCivil');
    } else if (this.marcador === 4) {
      this.marcador = 3;
    }
  }
  private toStr(v: unknown): string {
    return (v ?? '').toString().trim();
  }
  private buildSeguroData(): SeguroData {
    const v = this.form.value;
    return {
      tipo: this.tipo_vehiculo,
      marca: this.toStr(this.selectedMarcaNombre),
      modelo: v.modelo,
      version: v.version,
      anio: v.anio,
      nombre: v.nombre,
      correo: v.correo,
      estadoCivil: this.mapEstadoCivil(v.estadoCivil),
      fechaNacimiento: this.formatFecha(v.fechaNacimiento),
      codigoPostal: v.codigoPostal,
    };
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

    const data = this.buildSeguroData();

    if (tipo === 'whatsapp') {
      this.contactosService.cotizaSeguro(data);
      this.marcador = 1;
      this.router.navigateByUrl('/seguros/disponibles');
      this.form.reset();
      return;
    }

    this.mostrar_spinnet = true;
    // componente
    this.seguros.cotizaManual(data).subscribe({
      next: (res) => {
        this.mostrar_spinnet = false;
        if (res.status === 200) {
          this.generalService.alert(
            `Tu solicitud fue enviada correctamente por ${tipo}.`,
            'Envío exitoso',
            'success'
          );
          this.marcador = 1;
          this.router.navigateByUrl('/seguros/disponibles');
          this.form.reset();
        } else {
          this.generalService.alert(
            'Ocurrió un problema al enviar tus datos. Intenta nuevamente.',
            'Error en el envío',
            'danger'
          );
        }
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
  public selectOtherBrand(): void {
    this.router.navigateByUrl('/seguros/cotizar-manual');
  }
  private LOGO_FALLBACKS: Record<string, string> = {
    'Giant Motors': '/assets/icon/giant-motors.jpeg',
  };
  private GetMarcas() {
    if (this.tipo_vehiculo === 'Camion') {
      this.carsService.GetMarcasCamiones().subscribe({
        next: (res: any[]) => {
          this.marcasCamionesERT = (res || []).map((m) => {
            if (!m.imageUrl && this.LOGO_FALLBACKS[m.nombre]) {
              m.imageUrl = this.LOGO_FALLBACKS[m.nombre];
            }
            return m;
          });

          this.cdr.markForCheck();
        },
        error: () => {
          this.marcasCamionesERT = [];
        },
      });
    } else if (this.tipo_vehiculo === 'Moto') {
      this.motosService.getMarcas().subscribe({
        next: (data: Marca[]) => {
          this.marcasMotos = data.sort((a: Marca, b: Marca) =>
            a.nombre.toLowerCase().localeCompare(b.nombre.toLowerCase())
          );
        },
        error: (err) => {
          const mensaje = err?.error?.message || "Error al cargar marcas - Motos";
          console.warn(mensaje);
        },
        complete: () => {
          this.generalService.loadingDismiss();
        },
      });
    } else if (this.tipo_vehiculo === 'ERT') {
      this.carsService.getMarcas_all().subscribe({
        next: (res: any[]) => {
          const fromAPI = (res || []).map(m => ({
            key: (m?.key || '').toLowerCase(),
            nombre: m?.nombre || '',
            imageUrl: m?.imageUrl ?? null
          }));
          this.marcasCamionesERT = fromAPI;
        },
        error: (err) => console.error('Error al obtener marcas:', err),
      });

    }
  }
  private GetModelos(marca: string) {
    if (this.tipo_vehiculo === 'Camion') {
      this.carsService.GetModelosCamiones(marca).subscribe({
        next: (data) => {
          this.modelos = data;
        },
        error: (error) => {
          console.error("Error al obtener modelos:", error);
        },
        complete: () => {
          this.generalService.loadingDismiss();
        },
      });
    } else if (this.tipo_vehiculo === 'Moto') {
      this.motosService.GetModelos(marca).subscribe({
        next: (data) => {
          this.modelos = data;
        },
        error: (error) => {
          console.error("Error al obtener modelos:", error);
        },
        complete: () => {
          this.generalService.loadingDismiss();
        },
      });
    } else if (this.tipo_vehiculo === 'ERT') {
      const anio = this.form.value.anio;
      const key = this.form.value.marca;
      this.carsService.GetModelos(key, anio).subscribe({
        next: (data) => {
          this.modelos = data;
        },
        error: (error) => {
          console.error('Error al obtener modelos:', error);
        },
        complete: () => {
          this.generalService.loadingDismiss();
        },
      });
    }
  }
  selectMarca(marca: any): void {
    if (this.tipo_vehiculo === 'ERT') {
      this.selectedMarcaNombre = marca.nombre;
      this.form.get('marca')?.setValue(marca.key);
    } else {
      this.selectedMarcaNombre = marca.nombre;
      this.form.get('marca')?.setValue(marca._id);
    }
  }
  isSelected(id: string): boolean {
    return this.form.get('marca')?.value === id;
  }
  analizaForm(campo: string): boolean {
    const control = this.form.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
  onMarcaChange(ev: CustomEvent) {
    const id = ev.detail?.value;
    if (!id) return;
    const marca = (this.marcasMotos || []).find((x: any) => x._id === id);
    if (marca) this.selectMarca(marca);
  }
  onModeloChange(ev: CustomEvent) {
    const value = ev.detail?.value;
    if (value === this.OTRO_MODELO) {
      this.showOtroModelo = true;
      this.form.get('modelo')?.setValue('');
      this.form.get('modelo')?.markAsTouched();
      setTimeout(() => document.getElementById('modeloInput')?.focus(), 0);
      return;
    }
    this.showOtroModelo = false;
    this.form.get('modelo')?.setValue(value);
  }
  usarListaModelos() {
    this.showOtroModelo = false;
    this.form.get('modelo')?.setValue(null);
    this.form.get('modelo')?.markAsUntouched();
  }
  public onSelectAnio(ev: CustomEvent) {
    this.GetModelos(this.selectedMarcaNombre)
  }

  // ----- SELECTS -- FORMATO PARA Q SE VEAN BIEN ----

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
      { label: 'Marca', value: this.selectedMarcaNombre },
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

  // ----- FECHA DE NACIMIENTO -----

  // 2) Validador de mayoría de edad
  private mayorDeEdadValidator(edadMin = 18) {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = control.value;
      if (!v) return null;

      const cumple = this.esMayorDeEdad(v, edadMin);
      return cumple ? null : { underage: true };
    };
  }

  // 3) Util: checar edad
  private esMayorDeEdad(fecha: string | Date, edadMin = 18): boolean {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return false;

    const hoy = new Date();
    let edad = hoy.getFullYear() - d.getFullYear();
    const m = hoy.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < d.getDate())) edad--;
    return edad >= edadMin;
  }

  // 4) Util: formatear YYYY-MM-DD (para [max])
  private toISODateOnly(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // 5) Suscripción al control para disparar alerta si es menor de edad
  private suscribirFechaNacimientoAlert() {
    const ctrl = this.form.get('fechaNacimiento');
    if (!ctrl) return;

    ctrl.valueChanges.subscribe(async (val) => {
      if (!val) return;
      if (ctrl.hasError('underage')) {
        await this.alertCtrl.create({
          header: 'Edad no válida',
          message: 'Debes ser mayor de 18 años para continuar.',
          buttons: ['Entendido'],
        }).then(a => a.present());
      }
    });
  }
  public onFechaNacimientoChange(_: Event) {
    const ctrl = this.form.get('fechaNacimiento');
    if (!ctrl) return;
    ctrl.updateValueAndValidity({ onlySelf: true });
  }
  private fechaMenosAnios(d: Date, years: number): Date {
    const x = new Date(d);
    x.setFullYear(x.getFullYear() - years);
    return x;
  }
  onDobChange(ev: CustomEvent) {
    const iso = (ev.detail as any)?.value;
    this.form.get('fechaNacimiento')?.setValue(iso);
    this.form.get('fechaNacimiento')?.markAsTouched();
    this.fechaNacimientoLabel = this.formatFecha(iso);
  }

}
