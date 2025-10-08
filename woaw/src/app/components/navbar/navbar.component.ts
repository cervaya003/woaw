import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { MenuController } from "@ionic/angular";
import { filter } from "rxjs/operators";
import { GeneralService } from "../../services/general.service";
import { PopoverController } from "@ionic/angular";
import { ModalController } from "@ionic/angular";
import { HistorealSearchComponent } from "../../components/historeal-search/historeal-search.component";
import { ActivatedRoute, Router, NavigationEnd } from "@angular/router";
import { PerfilComponent } from "../modal/perfil/perfil.component";
import { MotosService } from "../../services/motos.service";
import { SpinnerComponent } from "../../components/spinner/spinner.component";

@Component({
  selector: "app-navbar",
  templateUrl: "./navbar.component.html",
  styleUrls: ["./navbar.component.scss"],
  standalone: true,
  imports: [IonicModule, CommonModule, SpinnerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class NavbarComponent implements OnInit {
onClear() {
throw new Error('Method not implemented.');
}
  esDispositivoMovil: boolean = false;
  mostrar_spinnet: boolean = false;
  estaEnHome: boolean = false;
  public isLoggedIn: boolean = false;
  menuCochesAbierto = false;

  public usuario: string = "...";
  public fotoPerfil: string | null = null; // ← NUEVO

  // -----
  popoverRef: HTMLIonPopoverElement | null = null;
  terminoBusqueda: string = "";
  sugerencias: string[] = [];
  // -----
  terminoBusquedaURL: string = "";
  mostrarBuscador = false;

  constructor(
    private menu: MenuController,
    private router: Router,
    public generalService: GeneralService,
    private modalCtrl: ModalController,
    private popoverCtrl: PopoverController,
    private route: ActivatedRoute,
    public motoservice: MotosService
  ) {}

  ngOnInit() {
    // Detectar tipo de dispositivo
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === "telefono" || tipo === "tablet";
    });

    // Detectar ruta actual
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.estaEnHome = event.urlAfterRedirects === "/home";
      });

    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
      // Relee datos por si cambió el usuario en runtime
      if (estado) this.leerUsuarioLocal();
    });

    this.route.params.subscribe((params) => {
      if (this.router.url.includes("/search/vehiculos") && params["termino"]) {
        this.terminoBusquedaURL = decodeURIComponent(params["termino"]);
      }
    });

    // Leer usuario/foto del storage
    this.leerUsuarioLocal();
  }

  // --- helper para leer nombre y foto del localStorage ---
  private leerUsuarioLocal() {
    const storage = localStorage.getItem("user");
    if (storage) {
      try {
        const usuario = JSON.parse(storage);
        this.usuario = usuario.nombre?.split(" ")[0] || "";
        this.fotoPerfil = this.getFotoFromUser(usuario);
      } catch {
        this.usuario = "...";
        this.fotoPerfil = null;
      }
    } else {
      this.usuario = "...";
      this.fotoPerfil = null;
    }
  }

  // --- busca la URL de foto en varias claves posibles ---
  private getFotoFromUser(u: any): string | null {
    const candidatos: any[] = [
      u?.foto,
      u?.picture,
      u?.photoURL,
      u?.photoUrl,
      u?.image,
      u?.imageUrl,
      u?.avatar,
      u?.avatarUrl,
      u?.profilePic,
      u?.profile_picture,
      u?.profilePhoto,
      u?._json?.picture,
      u?._json?.image,
      u?.providerData?.[0]?.photoURL,
      u?.datosGoogle?.picture,
    ].filter(Boolean);
    if (!candidatos.length) return null;
    const urlHttp = candidatos.find((v: any) =>
      /^https?:\/\//i.test(String(v))
    );
    const url = (urlHttp || String(candidatos[0])).toString().trim();
    return url || null;
  }

  openMenu() {
    this.menu.enable(true, "menuLateral");
    this.menu.open("menuLateral");
  }

  redirecion(url: string) {
    this.router.navigate([url]);
  }

  isActive(ruta: string): boolean {
    const url = this.router.url;
    if (ruta === "home") {
      return url === "/home" || url === "/";
    }
    return url === `/${ruta}` || url.startsWith(`/${ruta}/`);
  }

  getTituloSeccion(): string {
    const ruta = this.router.url;

    if (ruta.includes("/home") || ruta === "/") return "Inicio";
    if (ruta.includes("/nuevos")) return "Autos Nuevos";
    if (ruta.includes("/seminuevos")) return "Autos Seminuevos";
    if (ruta.includes("/usados")) return "Autos Usados";
    if (ruta.includes("/favoritos")) return "Mis Favoritos";
    if (ruta.includes("/inicio")) return "Iniciar sesión";
    if (ruta.includes("/mis-autos")) return "Mis autos";
    if (ruta.includes("/arrendamiento")) return "Arrendamiento";
    if (ruta.includes("/renta-coches")) return "Renda de autos";
    if (ruta.includes("/seguros")) return "Seguro de autos";
    if (ruta.includes("/m-nuevos")) return "Motos";
    if (ruta.includes("/seguros-disponibles")) return "Seguros disponibles";

    if (ruta.includes("/search/vehiculos")) {
      return this.terminoBusquedaURL ? `"${this.terminoBusquedaURL}"` : "";
    }

    return "wo-aw";
  }

  redirecion_logo() {
    this.router.navigate(["/home"]);
  }

  async abrirPopover(tipo: "Autos" | "Motos" | "Camiones") {
    this.router.navigate(["/menu-vehiculos", tipo.toLowerCase()]);
  }

  async abrirHistorial(ev: Event) {
    if (this.popoverRef) return;

    this.popoverRef = await this.popoverCtrl.create({
      component: HistorealSearchComponent,
      componentProps: {
        termino: this.terminoBusqueda,
      },
      event: ev,
      translucent: true,
      showBackdrop: false,
      backdropDismiss: true,
      keyboardClose: false,
      cssClass: "popover-historial",
    });

    await this.popoverRef.present();

    this.popoverRef.onDidDismiss().then(({ data }) => {
      if (data) {
        this.terminoBusqueda = data;
        this.irABusqueda(data);
      }
      this.popoverRef = null;
    });
  }

  onInputChange(ev: any) {
    const value = ev.detail.value;
    this.terminoBusqueda = value;
    if (this.popoverRef) {
      this.popoverRef.componentProps = { termino: value };
    } else {
      this.abrirHistorial(ev);
    }
  }

  irABusqueda(sugerencia: string) {
    const termino = sugerencia.trim();
    if (!termino) return;
    this.terminoBusqueda = termino;
    this.guardarStorage(termino);
    this.generalService.setTerminoBusqueda("search");
    if (this.popoverRef) {
      this.popoverRef.dismiss();
      this.popoverRef = null;
    }
    this.router.navigate(["/search/vehiculos", termino]);
  }

  guardarStorage(termino: string) {
    const guardado = localStorage.getItem("historialBusqueda");
    let historial: string[] = guardado ? JSON.parse(guardado) : [];
    historial = historial.filter(
      (item) => item.toLowerCase() !== termino.toLowerCase()
    );
    historial.unshift(termino);
    historial = historial.slice(0, 10);
    localStorage.setItem("historialBusqueda", JSON.stringify(historial));
  }

  cerrarBuscador() {
    this.mostrarBuscador = false;
    this.terminoBusqueda = "";
  }

  async abrirModalPerfil() {
    this.mostrar_spinnet = true;
    setTimeout(async () => {
      this.mostrar_spinnet = false;
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
}
