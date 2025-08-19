import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RegistroService } from '../../services/registro.service';
import { LoteService } from '../../services/lote.service';
import { ModalController } from '@ionic/angular';
import imageCompression from 'browser-image-compression';
import { GeneralService } from '../../services/general.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-lotes',
  templateUrl: './lotes.page.html',
  styleUrls: ['./lotes.page.scss'],
  standalone: false
})
export class LotesPage implements OnInit {
  public isLoggedIn: boolean = false;
  public MyRole: 'admin' | 'lotero' | 'vendedor' | 'cliente' | null = null;

  addLote: boolean = false;
  terminoBusqueda: string = '';

  // Datos visibles (según tab activo)
  lotes: any[] = [];
  lotesFiltrados: any[] = [];
  totalLotes: number = 0;

  // Tabs: todos/mios
  activeTab: 'todos' | 'mios' = 'todos';
  lotesAll: any[] = [];
  lotesMine: any[] = [];

  mostrarAuto: boolean = false;
  loteSelect: any[] = [];

  constructor(
    private registroService: RegistroService,
    private toastCtrl: ToastController,
    private modalController: ModalController,
    private generalService: GeneralService,
    private loteservice: LoteService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit() {
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });

    this.generalService.tipoRol$.subscribe((rol) => {
      if (rol === 'admin' || rol === 'lotero' || rol === 'vendedor' || rol === 'cliente') {
        this.MyRole = rol;
      } else {
        this.MyRole = null; // usuarios no logueados o rol desconocido
      }
      // Trae lotes cuando ya conocemos (o no) el rol
      this.getLotes();
    });
  }

  add_lote() {
    this.addLote = !this.addLote;
  }

  getLotes() {
    // Siempre trae TODOS
    this.loteservice.getlotes('all').subscribe({
      next: async (res) => {
        this.lotesAll = res?.lotes || [];

        // Si es admin/lotero, también trae MIS lotes
        if (this.MyRole === 'admin' || this.MyRole === 'lotero') {
          this.loteservice.getlotes('mios').subscribe({
            next: async (res2) => {
              this.lotesMine = res2?.lotes || [];
              this.applyTab(this.activeTab); // respeta el tab activo
            },
            error: async () => {
              this.lotesMine = [];
              this.applyTab('todos');
            }
          });
        } else {
          // Otros roles o visitantes: solo "todos"
          this.lotesMine = [];
          this.applyTab('todos');
        }
      },
      error: async (error) => {
        await this.generalService.loadingDismiss();
        await this.generalService.alert(
          'Verifica tu red',
          'Error de red. Intenta más tarde.',
          'danger'
        );
      },
    });
  }

  applyTab(tab: 'todos' | 'mios') {
    this.activeTab = tab;
    const base = (tab === 'mios') ? this.lotesMine : this.lotesAll;
    this.lotes = base;
    this.filtrarLotes(); // usa el término actual y actualiza total
  }

  getFechaBonita(fecha: string): string {
    const opciones: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    };
    return new Date(fecha).toLocaleDateString('es-MX', opciones);
  }

  doRefresh(event: any) {
    this.getLotes();
    this.addLote = false;
    setTimeout(() => {
      event.target.complete();
    }, 1500);
  }

  filtrarLotes() {
    const termino = this.terminoBusqueda.toLowerCase().trim();
    const base = (this.activeTab === 'mios') ? this.lotesMine : this.lotesAll;

    if (!termino) {
      this.lotesFiltrados = [...base];
      this.totalLotes = this.lotesFiltrados.length;
      return;
    }

    this.lotesFiltrados = base.filter((lote) => {
      // direccion puede ser objeto o arreglo; tomamos el primero si es arreglo
      const dir = Array.isArray(lote?.direccion) ? lote.direccion[0] : lote?.direccion;
      const nombre = (lote?.nombre || '').toLowerCase();
      const ciudad = (dir?.ciudad || '').toLowerCase();
      const estado = (dir?.estado || '').toLowerCase();

      return (
        nombre.includes(termino) ||
        ciudad.includes(termino) ||
        estado.includes(termino)
      );
    });

    this.totalLotes = this.lotesFiltrados.length;
  }

  mostrarAutos(lote: any) {
    const nombreURL = encodeURIComponent(lote?.nombre || '');
    localStorage.setItem('origenLote', `/lote/${nombreURL}/${lote?._id}`);
    this.router.navigate(['/lote', nombreURL, lote?._id]);
  }

  BackLote() {
    this.router.navigate(['/lotes']);
  }
}
