import { Component, OnInit, OnDestroy, NgZone } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule, MenuController, ModalController } from "@ionic/angular";
import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { GeneralService } from "../../services/general.service";
import { PerfilComponent } from "../modal/perfil/perfil.component";

type SectionKey = "configuracion" | "servicios" | "publicaciones";

@Component({
  selector: "app-menulateral",
  templateUrl: "./menulateral.component.html",
  styleUrls: ["./menulateral.component.scss"],
  standalone: true,
  imports: [IonicModule, CommonModule, SpinnerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MenulateralComponent implements OnInit, OnDestroy {
  public isLoggedIn = false;
  public MyRole: string | null = null;
  mostrar_spinnet: boolean = false;
  private readonly MENU_CLOSE_DELAY_MS = 250;
  private subs: Subscription[] = [];
  private readonly ALLOWED_ROLES = new Set(["admin", "vendedor", "lotero"]);
  get isPublisher(): boolean {
    return this.isLoggedIn && this.ALLOWED_ROLES.has(this.MyRole || "");
  }

  expandedSections: Record<
    "configuracion" | "servicios" | "publicaciones",
    boolean
  > = {
      configuracion: false,
      servicios: false,
      publicaciones: false,
    };
  constructor(
    private router: Router,
    private menuCtrl: MenuController,
    public generalService: GeneralService,
    private modalCtrl: ModalController,
    private zone: NgZone
  ) { }

  ngOnInit() {
    // Suscripción al estado de sesión
    this.subs.push(
      this.generalService.tokenExistente$.subscribe((estado) => {
        const before = this.isLoggedIn;
        this.isLoggedIn = estado;

        if (estado === false) {
          this.setSections({
            configuracion: false,
            servicios: true,
            publicaciones: false
          });
          return;
        }
        if (before === false && estado === true) {
          this.setSections({
            configuracion: false,   // no abras "Cuenta"
            servicios: true,        // queda desplegado
            publicaciones: false    // el rol decide si se muestra; inicia cerrada
          });
          return;
        }
      })
    );

    // Suscripción al rol
    this.subs.push(
      this.generalService.tipoRol$.subscribe((rol) => {
        this.MyRole = rol;
        if (!this.isPublisher) this.setSections({ publicaciones: false });
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s?.unsubscribe());
  }

  // Utilidad para setear ambos flags de golpe (gatilla change detection bien)
  private setSections(state: Partial<Record<SectionKey, boolean>>) {
    this.expandedSections = {
      ...this.expandedSections,
      ...state,
    };
  }

  private closeAll() {
    (Object.keys(this.expandedSections) as SectionKey[]).forEach((k) => {
      this.expandedSections[k] = false;
    });
  }

  toggleSection(section: SectionKey) {
    const willOpen = !this.expandedSections[section]; // estado deseado para la clickeada
    this.closeAll(); // cierra todas
    this.expandedSections[section] = willOpen; // abre solo la seleccionada (o queda todo cerrado si estaba abierta)
  }

  async redirecion(url: string) {
    try {
      const target = "/" + url.replace(/^\/+/, "");
      if (this.router.url === target) {
        await this.menuCtrl.close("menuLateral");
        return;
      }
      await this.menuCtrl.close("menuLateral");
      await this.sleep(this.MENU_CLOSE_DELAY_MS);
      this.zone.run(() => this.router.navigateByUrl(target));
    } catch (err) {
      console.error("❌ Redirección fallida:", err);
    }
  }

  cerrarMenu() {
    this.menuCtrl.close("menuLateral");
  }

  isActive(url: string): boolean {
    const target = "/" + url.replace(/^\/+/, "");
    return this.router.url === target;
  }

  async logout() {
    this.generalService.confirmarAccion(
      "¿Deseas salir?",
      "¿Estás seguro de que deseas salir de la aplicación?",
      async () => {
        this.generalService.eliminarToken();
        await this.menuCtrl.close("menuLateral");
        await this.sleep(300);
        this.zone.run(() => {
          this.router.navigate(["/home"]);
          this.generalService.alert(
            "¡Saliste de tu sesión!",
            "¡Hasta pronto!",
            "info"
          );
        });
      }
    );
  }

  async abrirModalPerfil() {
    this.mostrar_spinnet = true;
    setTimeout(async () => {
    this.mostrar_spinnet = false;
      await this.menuCtrl.close("menuLateral");
      await this.sleep(200);
      await this.generalService.loadingDismiss();

      const modal = await this.modalCtrl.create({
        component: PerfilComponent,
        breakpoints: [0, 0.5, 0.8, 1],
        cssClass: "modal-perfil",
        initialBreakpoint: 0.8,
        handle: true,
        showBackdrop: true,
      });
      await modal.present();
    }, 1000);
  }

  abrirmodal() {
    this.generalService.alert(
      "Error de conexión",
      "Ups, algo salió mal vuelve a intentarlo",
      "info"
    );
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
