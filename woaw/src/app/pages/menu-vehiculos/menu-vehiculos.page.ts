import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { AlertController } from "@ionic/angular";
import { Router } from "@angular/router";
import { CarsService } from "../../services/cars.service";
import { GeneralService } from "../../services/general.service";
import { DomSanitizer } from "@angular/platform-browser";

interface Ubicacion {
  ciudad?: string;
  estado?: string;
  lat?: number;
  lng?: number;
}
interface Version {
  Precio?: number | string;
  precio?: number | string;
  [k: string]: any;
}
interface AutoCard {
  _id: string;
  marca: string;
  modelo: string;
  anio: number;
  tipoVenta: "nuevo" | "seminuevo" | "usado";
  imagenPrincipal?: string;
  ubicacion?: Ubicacion;
  version?: Version[];
  precio?: number | string | null;
  transmision?: string;
  combustible?: string;
  kilometraje?: number | null;
  [k: string]: any;
}

@Component({
  selector: "app-menu-vehiculos",
  templateUrl: "./menu-vehiculos.page.html",
  styleUrls: ["./menu-vehiculos.page.scss"],
  standalone: false,
})
export class MenuVehiculosPage implements OnInit {
  tipoVehiculo!: string;
  esDispositivoMovil: boolean = false;

  autosNuevos: AutoCard[] = [];
  autosSeminuevos: AutoCard[] = [];
  autosUsados: AutoCard[] = [];

  public conUsados: number = 0;
  public conSeminuevos: number = 0;
  public conNuevos: number = 0;

  constructor(
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private router: Router,
    private generalService: GeneralService,
    public carsService: CarsService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === "telefono" || tipo === "tablet";
    });

    this.tipoVehiculo = this.route.snapshot.paramMap.get("tipo") || "";

    this.getCarsNews();
    this.getCarsSeminuevos();
    this.getCarsUsados();
  }

  // ==========================
  // Helpers de precio/ubicación
  // ==========================
  private toNumberSafe(v: any): number | null {
    if (v === null || v === undefined) return null;
    const n =
      typeof v === "string"
        ? Number(v.toString().replace(/[, ]+/g, ""))
        : Number(v);
    return Number.isFinite(n) ? n : null;
  }

  /** Precio mínimo dentro de version[].(Precio|precio) */
  private minPrecioDeVersion(a: AutoCard): number | null {
    const vs = Array.isArray(a?.version) ? a.version : [];
    const nums = vs
      .map((v) => this.toNumberSafe((v as any)?.Precio ?? (v as any)?.precio))
      .filter((n): n is number => n !== null);
    return nums.length ? Math.min(...nums) : null;
  }

  /** Regla:
   *  - NUEVO: siempre del mínimo de versiones
   *  - SEMINUEVO/USADO: usa a.precio si existe; si no, mínimo de versiones; si no, null
   */
  public getPrecio(a: AutoCard): number | null {
    if (!a) return null;
    if (a.tipoVenta === "nuevo") {
      return this.minPrecioDeVersion(a);
    }
    const p = this.toNumberSafe(a?.precio);
    return p ?? this.minPrecioDeVersion(a);
  }

  public getCiudad(a: AutoCard): string {
    return a?.ubicacion?.ciudad ?? "";
  }
  public getEstado(a: AutoCard): string {
    return a?.ubicacion?.estado ?? "";
  }

  public mostrarKilometraje(a: AutoCard): boolean {
    const km = this.toNumberSafe(a?.kilometraje);
    return km !== null && km >= 0;
  }

  /** trackBy para *ngFor */
  public trackById(_: number, a: AutoCard): string {
    return a?._id;
  }

  // ==========================
  // Carga de datos
  // ==========================

  getCarsUsados() {
    this.carsService.getCarsUsados().subscribe({
      next: (res: any) => {
           console.log('📦 Objeto recibido del backend (usados):', res); 
        this.conUsados = Number(res?.contador ?? 0);
        const autos: AutoCard[] = res?.coches || [];
        const autosAleatorios = [...autos].sort(() => Math.random() - 0.5);
        this.autosUsados = autosAleatorios;
         
      },
      error: (err) => {
        const mensaje = err?.error?.message || "Ocurrió un error inesperado";
        this.generalService.alert("Error de Conexión", mensaje);
      },
    });
  }
  getCarsSeminuevos() {
    this.carsService.getCarsSeminuevos().subscribe({
      next: (res: any) => {
           console.log('📦 Objeto recibido del backend (seminuevos):', res); 
        this.conSeminuevos = Number(res?.contador ?? 0);
        const autos: AutoCard[] = res?.coches || [];
        const autosAleatorios = [...autos].sort(() => Math.random() - 0.5);
        this.autosSeminuevos = autosAleatorios;
      },
      error: (err) => {
        const mensaje = err?.error?.message || "Ocurrió un error inesperado";
        this.generalService.alert("Error de Conexión", mensaje);
      },
    });
  }

  getCarsNews() {
    this.carsService.getCarsNews().subscribe({
      next: (res: any) => {
           console.log('📦 Objeto recibido del backend (nuevos):', res); 

           
        this.conNuevos = Number(res?.contador ?? 0);
        const autos: AutoCard[] = res?.coches || [];
        // Si quieres orden aleatorio en la vista:
        const autosAleatorios = [...autos].sort(() => Math.random() - 0.5);
        this.autosNuevos = autosAleatorios;
      },
      error: (err) => {
        const mensaje = err?.error?.message || "Ocurrió un error inesperado";
        this.generalService.alert("Error de Conexión", mensaje);
      },
    });
  }

  // ==========================
  // Navegación
  // ==========================
  public redirecion(url: string) {
    this.router.navigate([url]);
  }

    /** Redirige a la ficha del vehículo según su ID */
  public irAFichaAuto(id?: string) {
    if (!id) return;
    this.router.navigate(["/ficha", "autos", id]);
  }

}
