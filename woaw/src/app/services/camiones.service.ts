import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { Observable, from } from "rxjs";
import { switchMap, catchError } from "rxjs/operators";
import { HeadersService } from "./headers.service";

@Injectable({ providedIn: "root" })
export class CamionesService {
  constructor(
    private http: HttpClient,
    private headersService: HeadersService
  ) {}

  GetMarcasCamiones(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(
          `${environment.api_key}/camioninfo/marcas-camion`,
          { headers }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  GetModelosCamiones(marca: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(
          `${
            environment.api_key
          }/camioninfo/modelos-camion/${encodeURIComponent(marca)}`,
          { headers }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Si ya la tienes en otro servicio, puedes quitarla aquí */
  getRecomendadoCamion(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap(() => this.http.get(`${environment.api_key}/camiones/random`)),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  /** Ejemplo: /cars/id/user  (si es para autos, cámbialo a /camiones si aplica) */
  misCamionesId(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/camiones/id/user`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getcamionID(id: any): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/camiones/camiones/${id}`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  /** Guardar camión */
  guardarCamion(body: FormData): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getFormDataHeaders(token);
        return this.http.post(
          `${environment.api_key}/camiones/registrar`,
          body,
          { headers }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  getMyCamiones(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/camiones/camiones/user`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getAllCamiones(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/camiones/camiones`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // Obtener camiones favoritos del usuario
  getCamionesFavoritos(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/favoritos/camiones`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // Agregar un camión a favoritos
  agregarFavorito(camionId: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.post(
          `${environment.api_key}/favoritos/agregar`,
          { vehicleId: camionId },
          { headers }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // Quitar un camión de favoritos
  quitarFavorito(camionId: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.delete(
          `${environment.api_key}/favoritos/quitar/${camionId}`,
          { headers }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // Obtener detalle de un camión específico
  obtenerDetalleCamion(camionId: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/camiones/${camionId}`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // Cambiar estado de un camión (disponible/vendido)
  toggleEstadoVehiculo(camionId: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.put(
          `${environment.api_key}/camiones/toggle-estado/${camionId}`,
          {},
          { headers }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // Actualizar un camión existente
actualizarCamion(camionId: string, body: FormData): Observable<any> {
  return from(this.headersService.obtenerToken()).pipe(
    switchMap((token) => {
      if (!camionId) throw new Error('camionId vacío');
      const headers = this.headersService.getFormDataHeaders(token);
      // ✅ ID como segmento de ruta, sin ":id"
      const url = `${environment.api_key}/camiones/camiones/${encodeURIComponent(camionId)}`;
      return this.http.put(url, body, { headers });
    }),
    catchError((error) => this.headersService.handleError(error))
  );
}

  // Eliminar un camión
  eliminarCamion(camionId: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.delete(`${environment.api_key}/camiones/${camionId}`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // Obtener camiones por filtros
  getCamionesFiltrados(filtros: any): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.post(
          `${environment.api_key}/camiones/filtrar`,
          filtros,
          { headers }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // Obtener estadísticas de mis camiones
  getEstadisticasCamiones(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/camiones/estadisticas`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
}
