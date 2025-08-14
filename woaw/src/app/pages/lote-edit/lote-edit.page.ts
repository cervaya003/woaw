// src/app/pages/lote-edit/lote-edit.page.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import imageCompression from 'browser-image-compression';

import { GeneralService } from '../../services/general.service';
import { LoteService } from '../../services/lote.service';
import { MapaComponent } from '../../components/modal/mapa/mapa.component';

interface Direccion {
  ciudad: string;
  estado: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-lote-edit',
  templateUrl: './lote-edit.page.html',
  styleUrls: ['./lote-edit.page.scss'],
  standalone: false
})
export class LoteEditPage implements OnInit {
  formLote!: FormGroup;
  isLoggedIn = false;

  ubicacionesSeleccionadas: [string, string, number, number][] = [];
  direccionesTraducidas: string[] = [];

  previewImagenPrincipal: string | null = null;
  imagenPrincipal!: File | null;

  loteId!: string;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private generalService: GeneralService,
    private loteService: LoteService,
    private modalController: ModalController,
    private router: Router,
    private toastCtrl: ToastController,

  ) { }

  ngOnInit() {
    // 1) ID desde la URL
    this.loteId = this.route.snapshot.paramMap.get('id')!;

    // 2) Formulario (sin redes sociales ni imágenes secundarias)
    this.formLote = this.fb.group({

      nombre: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      email: [''],
      imagenPrincipal: [null], // opcional al editar
    });

    // 3) Auth
    this.generalService.tokenExistente$.subscribe((logged) => (this.isLoggedIn = logged));

    // 4) Cargar datos del lote
    this.loteService.getLoteById(this.loteId).subscribe({
      next: (lote) => {
        this.formLote.patchValue({

          nombre: lote.nombre,
          telefono: lote.telefonoContacto,
          email: lote.correoContacto || '',
        });

        // preview imagen principal
        this.previewImagenPrincipal = lote.imagenPrincipal || null;

        // ubicaciones
        if (Array.isArray(lote.direccion)) {
          const dirs = lote.direccion as Direccion[];
          this.ubicacionesSeleccionadas = dirs.map((d) => [d.ciudad, d.estado, d.lat, d.lng]);
          this.direccionesTraducidas = dirs.map((d) => `${d.ciudad}, ${d.estado}`);
        }


        // dejar el form "pristine" tras cargar
        this.formLote.markAsPristine();
      },
      error: (err) => {
        console.error('Error al cargar lote:', err);
        this.generalService.alert('Error', 'No se pudo cargar la información del lote', 'danger');
      },
    });
  }

async actualizarLote() {

  // Si no hubo cambios → alerta y salimos
  if (!this.formLote.dirty) {
    await this.generalService.alert(
      'Sin cambios',
      'No has modificado nada para guardar.',
      'warning'
    );
    return;
  }

  if (this.formLote.invalid) {
    this.formLote.markAllAsTouched();
    return;
  }

  // Normalizar NOMBRE (MAYÚSCULAS y máx. 25) antes de enviar
  const nombreNormalizado = (this.formLote?.value?.nombre ?? '')
    .toString()
    .toLocaleUpperCase('es-MX')
    .slice(0, 25)
    .trim();

  const formData = new FormData();
  formData.append('nombre', nombreNormalizado);
  formData.append('telefonoContacto', this.formLote.value.telefono || '');
  formData.append('correoContacto', this.formLote.value.email || '');

  // direcciones
  const dirs = this.ubicacionesSeleccionadas.map((u) => ({
    ciudad: u[0],
    estado: u[1],
    lat: u[2],
    lng: u[3],
  }));
  formData.append('direcciones', JSON.stringify(dirs));

  // imagen principal nueva (si el usuario la cambió)
  if (this.imagenPrincipal) {
    formData.append('imagenPrincipal', this.imagenPrincipal);
  }

  this.generalService.loading('Actualizando Lote...');
  this.loteService.editarLote(this.loteId, formData).subscribe({
    next: async () => {
      this.router.navigateByUrl('/lotes');
      await this.generalService.loadingDismiss();
      await this.generalService.alert('¡Listo!', 'Lote actualizado correctamente', 'success');
    },
    error: async () => {
      await this.generalService.loadingDismiss();
      await this.generalService.alert('Error', 'No se pudo actualizar el lote', 'danger');
    },
  });
}

  onNombreInput(ev: any) {
    const ctrl = this.formLote.get('nombre');
    if (!ctrl) return;

    const value: string = (ev?.detail?.value ?? '').toString();
    const normalizado = value.toLocaleUpperCase('es-MX').slice(0, 25);

    // Evita loops y solo corrige si cambió
    if (normalizado !== value) {
      ctrl.setValue(normalizado, { emitEvent: false });
    }
  }

  cancelar() {
    this.router.navigateByUrl('/lotes');

  }

  /** Abrir selector de archivo para imagen principal */
  async seleccionarImagenPrincipal(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0] ?? null;
      if (!file) return;
      try {
        const comprimido = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        });
        this.imagenPrincipal = comprimido;
        this.formLote.get('imagenPrincipal')?.setValue(comprimido);
        this.formLote.markAsDirty();

        const reader = new FileReader();
        reader.onload = () => (this.previewImagenPrincipal = reader.result as string);
        reader.readAsDataURL(comprimido);
      } catch {
        this.mostrarToast('Error al procesar la imagen', 'danger');
      }
    };
    input.click();
  }

  /** Selección de ubicación */
  async seleccionarUbicacion() {
    const modal = await this.modalController.create({ component: MapaComponent });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) {
      this.ubicacionesSeleccionadas.push(data as [string, string, number, number]);
      this.formLote.markAsDirty();
      const [, , lat, lng] = data as [string, string, number, number];
      try {
        const dir = await this.generalService.obtenerDireccionDesdeCoordenadas(lat, lng);
        this.direccionesTraducidas.push(dir);
      } catch {
        this.direccionesTraducidas.push('Dirección no disponible');
      }
    }
  }

  eliminarImagenPrincipal() {
    this.previewImagenPrincipal = null;
    this.imagenPrincipal = null;
    this.formLote.get('imagenPrincipal')?.reset();
    this.formLote.markAsDirty();
  }

  eliminarUbicacion(index: number) {
    this.ubicacionesSeleccionadas.splice(index, 1);
    this.direccionesTraducidas.splice(index, 1);
    this.formLote.markAsDirty();
  }

  private async mostrarToast(msg: string, color: string) {
    const t = await this.toastCtrl.create({ message: msg, color, duration: 2000 });
    await t.present();
  }

  irAInicio() {
    this.router.navigateByUrl('/inicio');
  }


  irLotes() {

    this.router.navigateByUrl('/lotes');
  }
}
