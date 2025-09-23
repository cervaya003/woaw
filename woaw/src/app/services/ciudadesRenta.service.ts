// src/app/services/ciudadesRenta.service.ts  (o ciudades-renta.service.ts)
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CiudadesRentaService {
  private readonly api = String(environment.api_key).replace(/\/+$/, '');

  constructor(private http: HttpClient) {}

  getObtenerEstado(): Observable<any> {
    return this.http.get(`${this.api}/rentalcars/estados`);
  }

  // ← ahora recibe estadoId y lo manda como ?estado=...
  getCiudades(estadoId: number | string): Observable<any> {
    const params = new HttpParams().set('estado', String(estadoId));
    return this.http.get(`${this.api}/rentalcars/estados/ciudades`, { params });
  }
}
