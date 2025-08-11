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
  lotes: any[] = [];
  lotesFiltrados: any[] = [];
  totalLotes: number = 0;
  mostrarAuto: boolean = false;
  loteSelect: any[] = [];

  constructor(
    private registroService: RegistroService,
    private toastCtrl: ToastController,
    private modalController: ModalController,
    private generalService: GeneralService,
    private loteservice: LoteService
  ) { }

  ngOnInit() {
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    this.generalService.tipoRol$.subscribe((rol) => {
      if (rol === 'admin' || rol === 'lotero' || rol === 'vendedor' || rol === 'cliente') {
        this.MyRole = rol;
      } else {
        this.generalService.eliminarToken();
        this.generalService.alert(
          '¡Saliste de tu sesión Error - 707!',
          '¡Hasta pronto!',
          'info'
        );
      }
    });
    this.getLotes();
  }
  add_lote() {
    this.addLote = !this.addLote;
  }

  getLotes() {
    const tipo = this.MyRole === 'admin' ? 'all' : 'mios';
    this.loteservice.getlotes(tipo).subscribe({
      next: async (res) => {
        // console.log(res);
        this.lotes = res.lotes;
        this.totalLotes = this.lotes.length;
        this.filtrarLotes();
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
    if (!termino) {
      this.lotesFiltrados = [...this.lotes];
      return;
    }

    this.lotesFiltrados = this.lotes.filter((lote) =>
      lote.nombre?.toLowerCase().includes(termino) ||
      lote.direccion?.ciudad?.toLowerCase().includes(termino) ||
      lote.direccion?.estado?.toLowerCase().includes(termino) 
    );
  }
  mostrarAutos(lote:any) {
    this.mostrarAuto = !this.mostrarAuto;
    this.loteSelect = lote;

  }
  BackLote() {
    this.mostrarAuto = false;
  }
}
