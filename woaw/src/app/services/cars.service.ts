import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { GeneralService } from '../services/general.service';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HeadersService } from './headers.service';

@Injectable({
  providedIn: 'root',
})
export class CarsService {
  public isLoggedIn: boolean = false;
  public MyRole: string | null = null;

  constructor(
    private http: HttpClient,
    private generalService: GeneralService,
    private router: Router,
    private headersService: HeadersService
  ) {
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    this.generalService.tipoRol$.subscribe((rol) => {
      this.MyRole = rol;
    });
  }

  //  ## ----- ----- -----
  //  ## ----- ----- -----

  // ☢️ ## ----- PETICIONES

  toggleEstadoVehiculo(autoId: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.patch(
          `${environment.api_key}/cars/vehiculos/${autoId}/toggle-estado`,
          {},
          { headers }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getCarsNews(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(
          `${environment.api_key}/cars/vehiculos?tipoVenta=nuevo`,
          {
            headers,
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getCarsSeminuevos(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(
          `${environment.api_key}/cars/vehiculos?tipoVenta=seminuevo`,
          {
            headers,
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getCarsUsados(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(
          `${environment.api_key}/cars/vehiculos?tipoVenta=usado`,
          {
            headers,
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  guardarAutos(datos: FormData, tipo: string): Observable<any> {
    let ApiURL = ``;
    if (tipo === 'Nuevo') {
      ApiURL = `${environment.api_key}/cars/nuevos`;
    } else if (tipo === 'Seminuevo') {
      ApiURL = `${environment.api_key}/cars/seminuevos`;
    } else if (tipo === 'Usado') {
      ApiURL = `${environment.api_key}/cars/usados`;
    }
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) =>
        this.http.post(`${ApiURL}`, datos, {
          headers: this.headersService.getFormDataHeaders(token),
        })
      ),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  EspesificacionesVersion(
    anio: number,
    marca: string,
    modelo: string,
    vers: string
  ): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        const params = {
          anio: anio.toString(),
          marca,
          modelo,
          version: vers,
        };
        return this.http.get(
          `${environment.api_key}/detalles/especificaciones`,
          {
            headers,
            params,
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  EspesificacionesVersionFicha(
    anio: number,
    marca: string,
    modelo: string,
    vers: string
  ): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        const params = {
          anio: anio.toString(),
          marca,
          modelo,
          version: vers,
        };
        return this.http.get(`${environment.api_key}/detalles/vistas`, {
          headers,
          params,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  agregarFavorito(vehicleId: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.post(
          `${environment.api_key}/wish-list/wish-list`,
          { vehicleId },
          { headers }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getCarsFavoritos_all(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/wish-list/vehicles`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getCarsFavoritos(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/wish-list/wish-list`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  eliminarFavorito(vehicleId: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.request(
          'DELETE',
          `${environment.api_key}/wish-list/wish-list`,
          {
            headers,
            body: { vehicleId },
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getCar(id: any): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/cars/vehiculos/${id}`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getMyCars(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/cars/vehiculos/user`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  // ME TRAE SOLO LOS ID DE TODOS MIS AUTOS, MOTOS, CAMIONES ( TODOS )
  misAutosId(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/cars/id/user`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  quitarfondoImg(imagenPrincipal: FormData | string): Observable<Blob> {
    this.generalService.loading('🖼️ Quitando fondo de imagen...');

    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const url = `${environment.api_key}/cars/remove-background`;
        const isFormData = imagenPrincipal instanceof FormData;
        const headers = isFormData
          ? this.headersService.getFormDataHeaders(token)
          : this.headersService.getJsonHeaders(token);
        const body = isFormData ? imagenPrincipal : { imagenPrincipal };
        return this.http.post(url, body, {
          headers,
          responseType: 'blob',
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  deleteCar(carId: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.request(
          'DELETE',
          `${environment.api_key}/cars/vehiculos/${carId}`,
          {
            headers,
            // body: { carId },
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  putCar(carId: string, datos: FormData | string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const isFormData = datos instanceof FormData;
        const headers = isFormData
          ? this.headersService.getFormDataHeaders(token)
          : this.headersService.getJsonHeaders(token);

        return this.http.request(
          'put',
          `${environment.api_key}/cars/vehiculos/${carId}`,
          {
            headers,
            body: datos,
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  gatTiposVeiculos(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.get(`${environment.api_key}/cars/tipos`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  // ## ----- -----
  // Coches
  GetMarcas(anio: number): Observable<any> {
    // this.generalService.loading('Obteniendo marcas...');
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        this.generalService.loadingDismiss();
        return this.http.get(
          `${environment.api_key}/detalles/marcas?anio=${anio}`,
          {
            headers,
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  GetMarcasCamiones(): Observable<any> {
    // this.generalService.loading('Obteniendo marcas...');
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        this.generalService.loadingDismiss();
        return this.http.get(
          `${environment.api_key}/camioninfo/marcas-camion`,
          {
            headers,
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getMarcas_all(): Observable<any> {
    // this.generalService.loading('Obteniendo marcas...');
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        this.generalService.loadingDismiss();
        return this.http.get(`${environment.api_key}/detalles/marcas/all`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  GetModelos(marca: string, anio: number): Observable<any> {
    // this.generalService.loading('Obteniendo modelos...');
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        this.generalService.loadingDismiss();
        return this.http.get(
          `${environment.api_key}/detalles/modelos?anio=${anio}&marca=${marca}`,
          {
            headers,
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  GetVersiones(anio: number, marca: string, modelo: string): Observable<any> {
    // this.generalService.loading('Obteniendo versiones...');
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        this.generalService.loadingDismiss();
        return this.http.get(
          `${environment.api_key}/detalles/versiones?anio=${anio}&marca=${marca}&modelo=${modelo}`,
          {
            headers,
          }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  GetModelosAll(marca: string, anio: number, tipo: string | null): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        this.generalService.loadingDismiss();
        const url =
          tipo === 'coche'
            ? `${environment.api_key}/detalles/modelos?anio=${anio}&marca=${marca}`
            : `${environment.api_key}/camioninfo/modelos-camion/${marca}`;
        return this.http.get(url, { headers });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // ## -----
  async agregarAFavoritos(autoId: string) {
    if (!this.isLoggedIn) {
      this.router.navigate(['/inicio']);
      this.generalService.alert(
        'Inicia sesión',
        'Debes iniciar sesión para poder agregar este vehículo a tus favoritos.',
        'info'
      );
      return;
    }

    // Mostrar spinner
    await this.generalService.loading('Agregando a favoritos...');

    this.agregarFavorito(autoId).subscribe({
      next: async () => {
        this.getCarsNews();
        await this.generalService.loadingDismiss();
      },
      error: async (err) => {
        await this.generalService.loadingDismiss();
        const mensaje =
          err.error?.message ||
          'No se pudo agregar el auto a favoritos. Intenta más tarde.';
        await this.generalService.alert('Error', mensaje, 'danger');
      },
    });
  }
  envio_notificacion(carId: string): Promise<any> {
    return firstValueFrom(
      from(this.headersService.obtenerToken()).pipe(
        switchMap((token) => {
          const headers = this.headersService.getJsonHeaders(token);
          this.generalService.loadingDismiss();
          return this.http.post(
            `${environment.api_key}/solicitudes/info`,
            { carId },
            { headers }
          );
        }),
        catchError((error) => {
          throw error;
        })
      )
    );
  }
  envio_notificacion_cotizador(): Promise<any> {
    return firstValueFrom(
      from(this.headersService.obtenerToken()).pipe(
        switchMap((token) => {
          this.generalService.loadingDismiss();
          return this.http.get(
            `${environment.api_key}/credito`,
          );
        }),
        catchError((error) => {
          throw error;
        })
      )
    );
  }
  envio_notificacion_arrendmiento(): Promise<any> {
    return firstValueFrom(
      from(this.headersService.obtenerToken()).pipe(
        switchMap((token) => {
          this.generalService.loadingDismiss();
          return this.http.get(
            `${environment.api_key}/arrendamiento`,
          );
        }),
        catchError((error) => {
          throw error;
        })
      )
    );
  }
  getBlog(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        this.generalService.loadingDismiss();
        return this.http.get(`${environment.api_key}/articulos`, {
          headers,
        });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // ----
  getRecomendadoAutos(id: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        return this.http.get(
          `${environment.api_key}/cars/random?id=${id}`
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getRecomendadoMotos(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        return this.http.get(
          `${environment.api_key}/motos/random`
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  getRecomendadoCamion(): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        return this.http.get(
          `${environment.api_key}/camiones/random`
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }

  // ----- search
  search(palabra: string, tipoBusqueda: string): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        this.generalService.loadingDismiss();

        const parametro =
          tipoBusqueda === 'tipoVehiculo' ? 'tipoVehiculo' : 'keywords';
        const url = `${
          environment.api_key
        }/vehiculos?${parametro}=${encodeURIComponent(palabra)}`;

        return this.http.get(url, { headers });
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
}

/**




exports.removeBackgroundBuffer = async (req, res) => {
  try {
    let bufferOriginal = null;

    if (req.files?.imagenPrincipal?.length > 0) {
      bufferOriginal = req.files.imagenPrincipal[0].buffer;
    } else if (req.body.imagenPrincipal) {
      const url = req.body.imagenPrincipal;
      const response = await axios.get(url, { responseType: "arraybuffer" });
      bufferOriginal = Buffer.from(response.data, "binary");
    } else {
      return res.status(400).json({ message: "No se proporcionó imagen." });
    }

    const bufferSinFondo = await quitarFondoCloudRun(bufferOriginal);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "inline; filename=procesada.png");
    res.send(bufferSinFondo);
  } catch (err) {
    console.error("Error al quitar fondo:", err.message);
    res
      .status(500)
      .json({ message: "Error al procesar la imagen", error: err.message });
  }
};



 */
