// import { Component, OnInit, TrackByFunction } from "@angular/core";
// import { Router } from "@angular/router";
// import { HttpClient } from "@angular/common/http";
// import { CiudadesRentaService } from "../../services/ciudadesRenta.service";
// import { forkJoin } from "rxjs";

// interface Ciudad {
//   nombre: string;
//   imagen: string;
//   disponible: boolean;
// }

// /* ================== Helpers fuera de la clase ================== */
// const norm = (s: string) =>
//   String(s || "")
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "")
//     .toLowerCase()
//     .trim();

// // Solo permitimos mostrar estas deshabilitadas:
// const ALLOW_DISABLED = new Set<string>([
//   "cdmx",
//   "ciudad de mexico",
//   "ciudad de méxico",
//   "mexico city",
//   "guadalajara",
//   "jalisco",
// ]);

// // Orden preferido para las deshabilitadas permitidas
// const ORDER_DISABLED = ["ciudad de méxico", "cdmx", "guadalajara", "jalisco"];

// /* ================== Componente ================== */
// @Component({
//   selector: "app-renta-ciudades",
//   templateUrl: "./renta-ciudades.page.html",
//   styleUrls: ["./renta-ciudades.page.scss"],
//   standalone: false,
// })
// export class RentaCiudadesPage implements OnInit {
//   estados: Ciudad[] = [];
//   readonly sizes = "(min-width:1200px) 23vw, (min-width:820px) 30vw, 48vw";

//   estadoApi: any[] = [];
//   ciudadesApi: any[] = [];

//   trackByNombre: TrackByFunction<Ciudad> = (_: number, item: Ciudad) =>
//     item.nombre;

//   constructor(
//     private router: Router,
//     private http: HttpClient,
//     private ciudadesRenta: CiudadesRentaService
//   ) {}

//   ngOnInit(): void {
//     this.cargarEstadosYDespuesEstados();
//   }

//   /** Trae estados, marca disponibles y arma el listado:
//    *  - Muestra TODOS los habilitados.
//    *  - De deshabilitados, solo CDMX y Guadalajara (si no vienen, se agregan).
//    */
//   private cargarEstadosYDespuesEstados(): void {
//     forkJoin({
//       todos: this.ciudadesRenta.getJalarEstado(),
//       disponibles: this.ciudadesRenta.getObtenerEstado(),
//     }).subscribe({
//       next: ({ todos, disponibles }) => {
//         const rawTodos: any[] =
//           Array.isArray(todos?.estados) ? todos.estados :
//           Array.isArray(todos?.data)    ? todos.data    :
//           Array.isArray(todos?.result)  ? todos.result  :
//           Array.isArray(todos)          ? todos         : [];

//         const rawDisp: any[] =
//           Array.isArray(disponibles?.estados) ? disponibles.estados :
//           Array.isArray(disponibles?.data)    ? disponibles.data    :
//           Array.isArray(disponibles?.result)  ? disponibles.result  :
//           Array.isArray(disponibles)          ? disponibles         : [];

//         const disponiblesSet = new Set(
//           rawDisp
//             .map((x: any) =>
//               typeof x === "string"
//                 ? x
//                 : (x?.name ??
//                    x?.nombre ??
//                    x?.estado ??
//                    x?.nombreEstado ??
//                    x?.state ??
//                    "")
//             )
//             .map((n: any) => String(n || ""))
//             .map(norm)
//             .filter(Boolean)
//         );

//         const seen = new Set<string>();
//         const todosNormalizados = rawTodos.reduce<Ciudad[]>((acc, item: any) => {
//           const nombre = (
//             typeof item === "string"
//               ? item
//               : (item?.name ??
//                  item?.nombre ??
//                  item?.estado ??
//                  item?.nombreEstado ??
//                  item?.state ??
//                  "")
//           )
//             .toString()
//             .trim();
//           if (!nombre) return acc;

//           const key = norm(nombre);
//           if (seen.has(key)) return acc;
//           seen.add(key);

//           const url = (
//             typeof item === "object"
//               ? (item.imageURL ??
//                  item.imagen ??
//                  item.image ??
//                  item.img ??
//                  item.foto ??
//                  item.icon ??
//                  item.urlImagen ??
//                  "")
//               : ""
//           )
//             .toString()
//             .trim();
//           const imagen = url && /^(https?:)?\/\//i.test(url) ? url : "";

//           const disponible = disponiblesSet.has(key);
//           acc.push({ nombre, imagen, disponible });
//           return acc;
//         }, []);

//         // 1) Habilitados: todos los que estén disponibles
//         const habilitados = todosNormalizados.filter((e) => e.disponible);

//         // 2) Deshabilitados PERMITIDOS (CDMX/Guadalajara), sin duplicar
//         const esPermitida = (n: string) => ALLOW_DISABLED.has(norm(n));
//         const deshabilitadosPermitidos = todosNormalizados.filter(
//           (e) => !e.disponible && esPermitida(e.nombre)
//         );

//         // 3) Si no vienen en payload, agregamos placeholders
//         const yaConsiderados = [...habilitados, ...deshabilitadosPermitidos];
//         const existeCDMX = yaConsiderados.some((e) =>
//           /ciudad de m[eé]xico|cdmx/i.test(e.nombre)
//         );
//         const existeGDL = yaConsiderados.some((e) =>
//           /guadalajara|jalisco/i.test(e.nombre)
//         );

//         if (!existeCDMX)
//           deshabilitadosPermitidos.push({
//             nombre: "Ciudad de México",
//             imagen: "",
//             disponible: false,
//           });
//         if (!existeGDL)
//           deshabilitadosPermitidos.push({
//             nombre: "Guadalajara",
//             imagen: "",
//             disponible: false,
//           });

//         // 4) Orden final: habilitados primero (alfabético), luego permitidos (orden preferido)
//         habilitados.sort((a, b) =>
//           norm(a.nombre).localeCompare(norm(b.nombre))
//         );
//         deshabilitadosPermitidos.sort((a, b) => {
//           const ia = ORDER_DISABLED.findIndex((x) =>
//             norm(a.nombre).includes(x)
//           );
//           const ib = ORDER_DISABLED.findIndex((x) =>
//             norm(b.nombre).includes(x)
//           );
//           return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
//         });

//         this.estados = [...habilitados, ...deshabilitadosPermitidos];
//       },
//       error: (e) => console.error("Error al obtener estados:", e),
//     });
//   }

//   /** Llama a tu endpoint de autos por estado (si aplica en ese flujo) */
//   private enviarEstadoAlBackend(estado: string): void {
//     if (!estado?.trim()) return;
//     const url = `/rentalcars?estado=${encodeURIComponent(estado)}`;
//     this.http.get(url).subscribe({
//       next: (resp: any) => {
//         this.ciudadesApi = Array.isArray(resp)
//           ? resp
//           : Array.isArray(resp?.autos)
//           ? resp.autos
//           : [];
//       },
//       error: (e) => console.error(`Error al obtener autos de ${estado}:`, e),
//     });
//   }

//   seleccionarCiudad(estado: Ciudad): void {
//     if (!estado?.disponible) return;
//     this.router.navigate(["/renta-coches"], {
//       queryParams: { estado: estado.nombre }, // clave: 'estado'
//     });
//   }

//   redirecion(url: string): void {
//     this.router.navigate([url]);
//   }

//   isActive(ruta: string): boolean {
//     const url = this.router.url;
//     if (ruta === "home") return url === "/home" || url === "/";
//     return url === `/${ruta}` || url.startsWith(`/${ruta}/`);
//   }
// }







import { Component, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { PopoverController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AlertController } from '@ionic/angular';
import { Router, NavigationEnd } from '@angular/router';
import { AfterViewInit, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PopUpComponent } from '../../components/modal/pop-up/pop-up.component';
import { ActivatedRoute } from '@angular/router';
import { CarsService } from '../../services/cars.service';
import { GeneralService } from '../../services/general.service';
import { HistorealSearchComponent } from '../../components/historeal-search/historeal-search.component';

@Component({
  selector: "app-renta-ciudades",
  templateUrl: "./renta-ciudades.page.html",
  styleUrls: ["./renta-ciudades.page.scss"],
  standalone: false,
})
export class RentaCiudadesPage implements OnInit {
  overlayLoaded = false;
  imgenPrincipal: string = '';

  constructor(
    private popoverCtrl: PopoverController,
    private alertCtrl: AlertController,
    private router: Router,
    private generalService: GeneralService,
    public carsService: CarsService) { }

  ngOnInit() {
    this.cargaimagen();
  }
  async cargaimagen() {
    this.imgenPrincipal = '/assets/autos/publicidad/renta.webp';
    this.generalService.addPreload(this.imgenPrincipal, 'image');
    try {
      await Promise.all([
        this.generalService.preloadHero(this.imgenPrincipal, 4500),
      ]);
    } finally {
    }
  }

}