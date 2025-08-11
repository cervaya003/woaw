// src/app/pages/lote/lote.page.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

import { LoteService } from '../../services/lote.service';
import { GeneralService } from '../../services/general.service';

interface Direccion {
  ciudad: string;
  estado: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-lote',
  templateUrl: './lote.page.html',
  styleUrls: ['./lote.page.scss'],
  standalone: false
})
export class LotePage implements OnInit {
  loteId!: string;
  lote: any | null = null;

  direccionCompleta = 'Obteniendo ubicación...';
  carrosDelLote: any[] = [];

  previewImagenPrincipal: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loteService: LoteService,
    private generalService: GeneralService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.loteId = this.route.snapshot.paramMap.get('id')!;
    this.cargarLote();
    this.cargarCarros();
  }

  private cargarLote(): void {
    this.loteService.getLoteById(this.loteId).subscribe({
      next: (lote) => {
        this.lote = lote;
        this.previewImagenPrincipal = lote?.imagenPrincipal || null;

        if (Array.isArray(lote?.direccion) && lote.direccion.length) {
          const d = lote.direccion[0] as Direccion;
          this.generalService
            .obtenerDireccionDesdeCoordenadas(d.lat, d.lng)
            .then((dir) => (this.direccionCompleta = dir))
            .catch(() => (this.direccionCompleta = 'No se pudo obtener la dirección.'));
        }
      },
      error: async () => {
        await this.generalService.alert('Error', 'No se pudo cargar el lote', 'danger');
        this.router.navigateByUrl('/lotes');
      },
    });
  }

  private cargarCarros(): void {
    this.loteService.getcarro(this.loteId).subscribe({
      next: (res) => (this.carrosDelLote = res || []),
      error: async () => {
        await this.generalService.alert('Verifica tu red', 'Error de red. Intenta más tarde.', 'danger');
      },
    });
  }

  editarLote(): void {
    if (!this.lote) return;
    this.router.navigate(['/lote-edit', this.lote._id]);
  }

  async copiarTelefono(): Promise<void> {
    if (!this.lote?.telefonoContacto) return;
    try {
      await navigator.clipboard.writeText(this.lote.telefonoContacto);
      const t = await this.toastCtrl.create({ message: 'Teléfono copiado', duration: 1500 });
      t.present();
    } catch {}
  }

  volver(): void {
    this.router.navigateByUrl('/lotes');
  }
}
