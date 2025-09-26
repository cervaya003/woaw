import { Component, OnInit, TrackByFunction } from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { CiudadesRentaService } from "../../services/ciudadesRenta.service";
import { forkJoin } from 'rxjs';

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

  estados: Ciudad[] = [];                       
  readonly sizes = "(min-width:1200px) 23vw, (min-width:820px) 30vw, 48vw";

  estadoApi: any[] = [];
  ciudadesApi: any[] = [];

  trackByNombre: TrackByFunction<Ciudad> = (_: number, item: Ciudad) => item.nombre;

  constructor(
    private router: Router,
    private http: HttpClient,                      
    private ciudadesRenta: CiudadesRentaService
  ) {}

  ngOnInit(): void {
    // this.cargarEstadosYDespuesEstados();
  }

  // 🔹 Trae estados y arma tus tarjetas sin imágenes estáticas
private cargarEstadosYDespuesEstados(): void {
  forkJoin({
    todos: this.ciudadesRenta.getJalarEstado(),
    disponibles: this.ciudadesRenta.getObtenerEstado(),
  }).subscribe({
    next: ({ todos, disponibles }) => {
      const rawTodos: any[] =
        Array.isArray(todos?.estados) ? todos.estados :
        Array.isArray(todos?.data)    ? todos.data    :
        Array.isArray(todos?.result)  ? todos.result  :
        Array.isArray(todos)          ? todos         : [];

      const rawDisp: any[] =
        Array.isArray(disponibles?.estados) ? disponibles.estados :
        Array.isArray(disponibles?.data)    ? disponibles.data    :
        Array.isArray(disponibles?.result)  ? disponibles.result  :
        Array.isArray(disponibles)          ? disponibles         : [];

      const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const disponiblesSet = new Set(
        rawDisp
          .map((x: any) => typeof x === 'string'
            ? x
            : (x?.name ?? x?.nombre ?? x?.estado ?? x?.nombreEstado ?? x?.state ?? '')
          )
          .map((n: any) => String(n || ''))
          .map(norm)
          .filter(Boolean)
      );

      const seen = new Set<string>();
      this.estados = rawTodos.reduce<Ciudad[]>((acc, item: any) => {
        const nombre = (
          typeof item === 'string'
            ? item
            : (item?.name ?? item?.nombre ?? item?.estado ?? item?.nombreEstado ?? item?.state ?? '')
        ).toString().trim();
        if (!nombre) return acc;

        const key = norm(nombre);
        if (seen.has(key)) return acc;
        seen.add(key);

        const url = (
          typeof item === 'object'
            ? (item.imageURL ?? item.imagen ?? item.image ?? item.img ?? item.foto ?? item.icon ?? item.urlImagen ?? '')
            : ''
        ).toString().trim();
        const imagen = url && /^(https?:)?\/\//i.test(url) ? url : '';

        const disponible = disponiblesSet.has(key);
        acc.push({ nombre, imagen, disponible });
        return acc;
      }, []);

      // Disponibles primero; luego alfabético (ignorando acentos)
      this.estados.sort((a, b) => {
        if (a.disponible !== b.disponible) return a.disponible ? -1 : 1;
        const an = norm(a.nombre), bn = norm(b.nombre);
        return an < bn ? -1 : an > bn ? 1 : 0;
      });
    },
    error: (e) => console.error('Error al obtener estados:', e),
  });
}

 
private enviarEstadoAlBackend(estado: string): void {
  if (!estado?.trim()) return;

  const url = `/rentalcars?estado=${encodeURIComponent(estado)}`; // ajusta si tu endpoint es otro

  this.http.get(url).subscribe({
    next: (resp: any) => {
      this.ciudadesApi = Array.isArray(resp) ? resp :
      Array.isArray(resp?.autos) ? resp.autos : [];
    },
    error: (e) => console.error(`Error al obtener autos de ${estado}:`, e),
  });
}



seleccionarCiudad(estado: Ciudad) {
  if (!estado?.disponible) return;
  this.router.navigate(['/renta-coches'], {
    queryParams: { estado: estado.nombre }
     // clave: 'estado'

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
