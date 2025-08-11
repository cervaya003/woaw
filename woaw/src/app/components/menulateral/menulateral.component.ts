import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { GeneralService } from '../../services/general.service';
import { AlertController } from '@ionic/angular';
import { Platform } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
// Importamos la modal de perfil
import { PerfilComponent } from '../modal/perfil/perfil.component';

import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { NgZone } from '@angular/core';

@Component({
  selector: 'app-menulateral',
  templateUrl: './menulateral.component.html',
  styleUrls: ['./menulateral.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class MenulateralComponent implements OnInit {
  public isLoggedIn: boolean = false;
  public MyRole: string | null = null;
  rutaPendiente: string | null = null;

  constructor(
    private router: Router,
    private menuCtrl: MenuController,
    public generalService: GeneralService,
    private alertController: AlertController,
    private modalCtrl: ModalController,
    private zone: NgZone,
    private platform: Platform
  ) {}

  ngOnInit() {
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    this.generalService.tipoRol$.subscribe((rol) => {
      this.MyRole = rol;
    });
  }
  async redirecion(url: string) {
    try {
      await this.menuCtrl.close('menuLateral');

      // Espera a que termine bien la animación visual
      await new Promise(resolve => setTimeout(resolve, 250));

      this.zone.run(() => {
        this.router.navigateByUrl('/' + url);
      });
    } catch (err) {
      console.error('❌ Redirección fallida:', err);
    }
  }
  cerrarMenu() {
    this.menuCtrl.close('menuLateral');
  }
  async logout() {
    // console.log(nuevaImagen);
    this.generalService.confirmarAccion(
      '¿Deseas salir?',
      '¿Estás seguro de que deseas salir de la aplicación?',
      async () => {
        await this.generalService.loading('Saliendo...');
        this.generalService.eliminarToken();
        this.cerrarMenu();
        setTimeout(() => {
          this.router.navigate(['/home']);
          this.generalService.alert(
            '¡Saliste de tu sesión!',
            '¡Hasta pronto!',
            'info'
          );
        }, 1500);
      }
    );
  }
  async abrirModalPerfil() {
    // Mostrar spinner
    await this.generalService.loading('Cargando...');
    this.cerrarMenu();
    setTimeout(async () => {
      // Ocultar spinner
      await this.generalService.loadingDismiss();
      const modal = await this.modalCtrl.create({
        component: PerfilComponent,
        breakpoints: [0, 0.5, 1],
        cssClass: 'modal-perfil',
        initialBreakpoint: 1,
        handle: true,
        showBackdrop: true,
      });
      await modal.present();
    }, 500);
  }
  abrirmodal() {
    this.generalService.alert(
      'Error de conexión',
      'Ups, algo salió mal vuelve a intentarlo',
      'info'
    );
  }
}
