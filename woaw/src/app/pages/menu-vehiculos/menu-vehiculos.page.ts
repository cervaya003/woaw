import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AlertController } from "@ionic/angular";
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
export class MenuVehiculosPage implements OnInit, OnDestroy {
  tipoVehiculo!: string;
  esDispositivoMovil = false;

  autosNuevos: AutoCard[] = [];
  autosSeminuevos: AutoCard[] = [];
  autosUsados: AutoCard[] = [];

  conUsados = 0;
  conSeminuevos = 0;
  conNuevos = 0;

  private timers: any[] = [];

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

  ngOnDestroy() {
    this.clearRotations();
  }

  // ========= Helpers precio/ubicación =========
  private toNumberSafe(v: any): number | null {
    if (v === null || v === undefined) return null;
    const n = typeof v === "string" ? Number(v.toString().replace(/[, ]+/g, "")) : Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private minPrecioDeVersion(a: AutoCard): number | null {
    const vs = Array.isArray(a?.version) ? a.version : [];
    const nums = vs
      .map((v) => this.toNumberSafe((v as any)?.Precio ?? (v as any)?.precio))
      .filter((n): n is number => n !== null);
    return nums.length ? Math.min(...nums) : null;
  }

  public getPrecio(a: AutoCard): number | null {
    if (!a) return null;
    if (a.tipoVenta === "nuevo") return this.minPrecioDeVersion(a);
    const p = this.toNumberSafe(a?.precio);
    return p ?? this.minPrecioDeVersion(a);
  }

  public getCiudad(a: AutoCard): string { return a?.ubicacion?.ciudad ?? ""; }
  public getEstado(a: AutoCard): string { return a?.ubicacion?.estado ?? ""; }

  public mostrarKilometraje(a: AutoCard): boolean {
    const km = this.toNumberSafe(a?.kilometraje);
    return km !== null && km >= 0;
  }

  public trackById(_: number, a: AutoCard): string { return a?._id; }

  // ========= Rotación de coches (array) =========
  private startRotation(ref: "autosUsados" | "autosSeminuevos" | "autosNuevos", ms = 15000) {
    const tick = () => {
      const list = this[ref] as AutoCard[];
      if (!Array.isArray(list) || list.length <= 1) return;

      // Si hay más de 5, rota completo; si hay 5 o menos, igual cicla para variación.
      const first = list[0];
      const rotated = [...list.slice(1), first];
      // Nueva referencia para garantizar cambio en la vista
      this[ref] = rotated;
    };

    // No creamos timers si no hay al menos 2
    if ((this[ref] as AutoCard[]).length > 1) {
      const id = setInterval(tick, ms);
      this.timers.push(id);
    }
  }

  private clearRotations() {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  // ========= Carga de datos =========
  getCarsUsados() {
    this.carsService.getCarsUsados().subscribe({
      next: (res: any) => {
        this.conUsados = Number(res?.contador ?? 0);
        const autos: AutoCard[] = res?.coches || [];
        this.autosUsados = [...autos].sort(() => Math.random() - 0.5);

        this.startRotation("autosUsados");
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
        this.conSeminuevos = Number(res?.contador ?? 0);
        const autos: AutoCard[] = res?.coches || [];
        this.autosSeminuevos = [...autos].sort(() => Math.random() - 0.5);

        this.startRotation("autosSeminuevos");
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
        this.conNuevos = Number(res?.contador ?? 0);
        const autos: AutoCard[] = res?.coches || [];
        this.autosNuevos = [...autos].sort(() => Math.random() - 0.5);

        this.startRotation("autosNuevos");
      },
      error: (err) => {
        const mensaje = err?.error?.message || "Ocurrió un error inesperado";
        this.generalService.alert("Error de Conexión", mensaje);
      },
    });
  }

  // ========= Navegación =========
  public redirecion(url: string) { this.router.navigate([url]); }
  public irAFichaAuto(id?: string) {
    if (!id) return;
    this.router.navigate(["/ficha", "autos", id]);
  }
}