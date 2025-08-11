import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RegistroService } from '../../../services/registro.service';
import { MapaComponent } from '../../modal/mapa/mapa.component';
import { ModalController } from '@ionic/angular';
import imageCompression from 'browser-image-compression';
import { GeneralService } from '../../../services/general.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AddComponent implements OnInit {

  formLote!: FormGroup;
  imagenLote!: File | null;
  constanciaPDF!: File | null;

  ubicacionesSeleccionadas: [string, string, number, number][] = [];
  direccionesTraducidas: string[] = [];

  imagenPrincipal!: File | null;

  previewImagenPrincipal: string | null = null;
  tipoDispocitivo: string = '';

  pocicion: boolean = true;
  public isLoggedIn: boolean = false;

  constructor(
    private fb: FormBuilder,
    private registroService: RegistroService,
    private toastCtrl: ToastController,
    private modalController: ModalController,
    private generalService: GeneralService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.formLote = this.fb.group({
      nombre: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern('[0-9]{10}')]],
      email: ['', Validators.email],
      imagenPrincipal: [null, Validators.required],
      constancia: [null],
    });

    this.generalService.dispositivo$.subscribe((tipo) => {
      this.tipoDispocitivo = tipo;
    });

    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
  }

  seleccionarConstancia(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = () => {
      const file = input.files?.[0] || null;
      if (file) {
        this.constanciaPDF = file;
        this.formLote.get('constancia')?.setValue(file);
      }
    };
    input.click();
  }

  async registrarLote(): Promise<void> {
    const faltantes = this.obtenerCamposInvalidos(1);

    if (faltantes.length > 0) {
      const mensaje = 'Faltan por llenar: ' + faltantes.join(', ');
      await this.generalService.alert(
        'Formulario incorrecto',
        mensaje,
        'warning'
      );
      return;
    }

    const formData = new FormData();

    // Campos básicos
    formData.append('nombre', this.formLote.value.nombre);
    formData.append('telefonoContacto', this.formLote.value.telefono);
    formData.append('correoContacto', this.formLote.value.email);

    if (this.ubicacionesSeleccionadas.length > 0) {
      const ubicacionesFormateadas = this.ubicacionesSeleccionadas.map((u) => ({
        ciudad: u[0],
        estado: u[1],
        lat: u[2],
        lng: u[3],
      }));

      formData.append('direcciones', JSON.stringify(ubicacionesFormateadas));
    }

    // Imagen principal
    if (this.imagenPrincipal) {
      formData.append('imagenPrincipal', this.imagenPrincipal);
    }

    // PDF opcional
    if (this.constanciaPDF) {
      formData.append('constancia', this.constanciaPDF);
    }

    this.generalService.loading('Creando Lote...');
    try {
      this.registroService.registroLote(formData).subscribe({
        next: async (res) => {
          this.generalService.loadingDismiss();
          this.cambioRol(res);

          this.formLote.reset();
          this.previewImagenPrincipal = null;
          this.imagenPrincipal = null;
          this.constanciaPDF = null;
          this.ubicacionesSeleccionadas = [];
          this.router.navigateByUrl('/lotes');
          await this.generalService.alert(
            'Lote creado',
            '¡Listo! Su lote fue creado correctamente',
            'success'
          );
        },
        error: async () => {
          this.generalService.loadingDismiss();
          await this.generalService.alert(
            'Error al registrar Lote',
            'Error de red. Intenta más tarde.',
            'danger'
          );
        },
      });
    } catch (error) {
      this.generalService.loadingDismiss();
      console.error('❌ Error al registrar lote:', error);
      this.mostrarToast('Error al registrar el lote', 'danger');
    }
  }

  obtenerCamposInvalidos(dato: number): string[] {
    const campos: { [clave: string]: string } = {
      nombre: 'Nombre del lote',
      telefono: 'Teléfono',
      email: 'Correo electrónico',
      imagenPrincipal: 'Imagen principal',
    };

    const faltantes: string[] = [];

    for (const control in this.formLote.controls) {
      if (this.formLote.get(control)?.invalid) {
        faltantes.push(campos[control] || control);
      }
    }

    if (dato == 1 && this.ubicacionesSeleccionadas.length === 0) {
      faltantes.push('Ubicación');
    }

    return faltantes;
  }

  private async mostrarToast(mensaje: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2500,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

  async seleccionarImagenPrincipal(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async () => {
      const file = input.files?.[0] || null;
      if (file) {
        try {
          const comprimido = await imageCompression(file, {
            maxSizeMB: 2,
            maxWidthOrHeight: 1600,
            useWebWorker: true
          });

          this.imagenPrincipal = comprimido;
          this.formLote.get('imagenPrincipal')?.setValue(comprimido);

          const reader = new FileReader();
          reader.onload = () => {
            this.previewImagenPrincipal = reader.result as string;
          };
          reader.readAsDataURL(comprimido);
        } catch (err) {
          console.error('❌ Error al comprimir imagen principal:', err);
          this.mostrarToast('Error al comprimir la imagen', 'danger');
        }
      }
    };

    input.click();
  }

  async seleccionarUbicacion() {
    if (this.ubicacionesSeleccionadas.length >= 5) {
      this.mostrarToast('Máximo 5 ubicaciones permitidas', 'warning');
      return;
    }

    const modal = await this.modalController.create({
      component: MapaComponent,
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data) {
      this.ubicacionesSeleccionadas.push(data);
      const [ciudad, estado, lat, lng] = data;

      try {
        const direccion = await this.generalService.obtenerDireccionDesdeCoordenadas(lat, lng);
        this.direccionesTraducidas.push(direccion);
      } catch (error) {
        console.warn('❌ Error obteniendo dirección:', error);
        this.direccionesTraducidas.push('No se pudo obtener la dirección.');
      }
    }
  }

  eliminarImagenPrincipal(): void {
    this.previewImagenPrincipal = null;
    this.imagenPrincipal = null;
    this.formLote.get('imagenPrincipal')?.reset();
  }

  eliminarUbicacion(index: number): void {
    this.ubicacionesSeleccionadas.splice(index, 1);
  }

  cambioRol(datos: any): void {
    try {
      if (!datos.token || !datos.rol) return;

      const usuarioGuardado = localStorage.getItem('user');
      if (!usuarioGuardado) return;

      const usuario = JSON.parse(usuarioGuardado);
      usuario.rol = datos.rol;
      this.generalService.guardarCredenciales(datos.token, usuario);
    } catch (error) {
      console.error('❌ Error actualizando rol:', error);
    }
  }

  async sigiente() {
    if (this.formLote.invalid) {
      this.formLote.markAllAsTouched();
      const faltantes = this.obtenerCamposInvalidos(0);
      const mensaje = 'Faltan por llenar: ' + faltantes.join(', ');
      this.generalService.loadingDismiss();
      await this.generalService.alert(
        'Formulario incorrecto',
        mensaje,
        'warning'
      );
      return;
    }
    this.pocicion = !this.pocicion;
  }

  irAInicio(): void {
    this.router.navigateByUrl('/inicio');
  }
}
