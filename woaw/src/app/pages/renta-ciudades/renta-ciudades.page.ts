import { Component, OnInit, TrackByFunction } from "@angular/core";
import { Router } from "@angular/router";
import { CiudadesRentaService } from "../../services/ciudadesRenta.service";

interface Ciudad {
  nombre: string;
  imagen: string;
  disponible: boolean;
}

@Component({
  selector: "app-renta-ciudades",
  templateUrl: "./renta-ciudades.page.html",
  styleUrls: ["./renta-ciudades.page.scss"],
  standalone: false,
})
export class RentaCiudadesPage implements OnInit {
  estados: Ciudad[] = [
    {
      nombre: "Guadalajara",
      imagen: "/assets/autos/publicidad/guadalajara.png",
      disponible: false,
    },
    {
      nombre: "Ciudad de México",
      imagen: "/assets/autos/publicidad/cmx.png",
      disponible: false,
    },
    {
      nombre: "Querétaro",
      imagen: "/assets/autos/publicidad/q.png",
      disponible: false,
    },
  ];

  readonly sizes = "(min-width:1200px) 23vw, (min-width:820px) 30vw, 48vw";

  estadoApi: any[] = [];
  ciudadesApi: any[] = [];

  trackByNombre: TrackByFunction<Ciudad> = (_: number, item: Ciudad) =>
    item.nombre;

  constructor(
    private router: Router,
    private ciudadesRenta: CiudadesRentaService
  ) {}

  ngOnInit(): void {
    this.cargarEstadosYDespuesEstados();
  }

  private cargarEstadosYDespuesEstados(): void {
    this.ciudadesRenta.getObtenerEstado().subscribe({
      next: (datos: any) => {
        const estadosApi: string[] = Array.isArray(datos?.estados)
          ? datos.estados
          : [];
        console.log(estadosApi);

        const nombreNuevo = estadosApi[0];
        if (
          typeof nombreNuevo === "string" &&
          !this.estados.some((e) => e.nombre === nombreNuevo)
        ) {
          this.estados = [
            ...this.estados,
            {
              nombre: nombreNuevo,
              imagen: "/assets/autos/publicidad/cancun.png",
              disponible: true,
            },
          ].reverse();
        }
      },
      error: (e) => console.error("Error al obtener estados:", e),
    });
  }

  // ✅ adapta aquí al shape real que regrese tu API
  private getEstadoId(e: any): number | string | undefined {
    return e?.id ?? e?.clave ?? e?.code ?? e?.codigo ?? e?.estadoId;
  }

  seleccionarCiudad(ciudad: Ciudad) {
    this.router.navigate(["/renta-coches"], {
      queryParams: { ciudad: ciudad.nombre },
    });
  }

  redirecion(url: string) {
    this.router.navigate([url]);
  }

  isActive(ruta: string): boolean {
    const url = this.router.url;
    if (ruta === "home") return url === "/home" || url === "/";
    return url === `/${ruta}` || url.startsWith(`/${ruta}/`);
  }
}
