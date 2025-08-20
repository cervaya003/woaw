import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, MenuController, ModalController } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';

import { GeneralService } from '../../services/general.service';
import { PerfilComponent } from '../modal/perfil/perfil.component';

@Component({
  selector: 'app-menulateral',
  templateUrl: './menulateral.component.html',
  styleUrls: ['./menulateral.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MenulateralComponent implements OnInit {
  public isLoggedIn = false;
  public MyRole: string | null = null;

  // Ajusta si tu animación del menú dura diferente (ms)
  private readonly MENU_CLOSE_DELAY_MS = 250;

  constructor(
    private router: Router,
    private menuCtrl: MenuController,
    public generalService: GeneralService,
    private modalCtrl: ModalController,
    private zone: NgZone
  ) { }

  ngOnInit() {
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    this.generalService.tipoRol$.subscribe((rol) => {
      this.MyRole = rol;
    });
  }

  /**
   * Cierra el menú y navega. Pensado para móvil:
   * - Cerramos el menú
   * - Esperamos la animación
   * - Navegamos dentro de NgZone para evitar taps dobles
   */
  async redirecion(url: string) {
    try {
      // Si ya estamos en esa ruta, solo cierra el menú y sal.
      const target = '/' + url.replace(/^\/+/, '');
      if (this.router.url === target) {
        await this.menuCtrl.close('menuLateral');
        return;
      }

      await this.menuCtrl.close('menuLateral');

      // Espera a que termine la animación del menú
      await this.sleep(this.MENU_CLOSE_DELAY_MS);

      this.zone.run(() => {
        this.router.navigateByUrl(target);
      });
    } catch (err) {
      console.error('❌ Redirección fallida:', err);
    }
  }

  cerrarMenu() {
    this.menuCtrl.close('menuLateral');
  }

  async logout() {
    this.generalService.confirmarAccion(
      '¿Deseas salir?',
      '¿Estás seguro de que deseas salir de la aplicación?',
      async () => {
        this.generalService.eliminarToken();
        await this.menuCtrl.close('menuLateral');
        // Pequeño delay para evitar cortes de animación
        await this.sleep(300);

        this.zone.run(() => {
          this.router.navigate(['/home']);
          this.generalService.alert('¡Saliste de tu sesión!', '¡Hasta pronto!', 'info');
        });
      }
    );
  }

  async abrirModalPerfil() {
    // Spinner
    await this.generalService.loading('Cargando...');

    await this.menuCtrl.close('menuLateral');
    // Espera breve para que no se empalme con la animación del menú
    await this.sleep(200);

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
  }

  abrirmodal() {
    this.generalService.alert(
      'Error de conexión',
      'Ups, algo salió mal vuelve a intentarlo',
      'info'
    );
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
