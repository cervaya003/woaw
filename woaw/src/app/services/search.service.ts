// services/search.service.ts
import { Injectable } from '@angular/core';

export interface SearchResult {
  titulo: string;
  descripcion: string;
  ruta: string;
  tipo: 'vehiculo' | 'servicio' | 'categoria';
  icono?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  private servicios: SearchResult[] = [
    // Vehículos
    {
      titulo: 'Autos Nuevos',
      descripcion: 'Compra autos nuevos de agencia',
      ruta: '/nuevos',
      tipo: 'categoria',
      icono: 'car-sport'
    },
    {
      titulo: 'Autos Seminuevos',
      descripcion: 'Autos seminuevos certificados',
      ruta: '/seminuevos',
      tipo: 'categoria',
      icono: 'car-sport'
    },
    {
      titulo: 'Autos Usados',
      descripcion: 'Autos usados en excelente estado',
      ruta: '/usados',
      tipo: 'categoria',
      icono: 'car-sport'
    },
    {
      titulo: 'Motos',
      descripcion: 'Motos nuevas y usadas',
      ruta: '/m-nuevos',
      tipo: 'categoria',
      icono: 'bicycle'
    },
    {
      titulo: 'Camiones',
      descripcion: 'Camiones y vehículos pesados',
      ruta: '/camiones/todos',
      tipo: 'categoria',
      icono: 'bus'
    },

    // Servicios
    {
      titulo: 'Arrendamiento',
      descripcion: 'Arrendamiento puro y financiero',
      ruta: '/arrendamiento',
      tipo: 'servicio',
      icono: 'document-text'
    },
    {
      titulo: 'Seguros',
      descripcion: 'Seguros para autos y personas',
      ruta: '/seguros/disponibles',
      tipo: 'servicio',
      icono: 'shield-checkmark'
    },
    {
      titulo: 'Renta de Autos',
      descripcion: 'Renta de autos por días',
      ruta: '/renta-ciudades',
      tipo: 'servicio',
      icono: 'calendar'
    },
    {
      titulo: 'Lotes',
      descripcion: 'Lotes de vehículos',
      ruta: '/lotes',
      tipo: 'servicio',
      icono: 'albums'
    },

    // Información
    {
      titulo: 'Conócenos',
      descripcion: 'Más información sobre WOAW',
      ruta: '/conocenos',
      tipo: 'servicio',
      icono: 'information-circle'
    },
    {
      titulo: 'Contacto',
      descripcion: 'Contáctanos para más información',
      ruta: '/home',
      tipo: 'servicio',
      icono: 'chatbubble-ellipses'
    },
    {
      titulo: 'Políticas',
      descripcion: 'Términos y condiciones',
      ruta: '/politicas',
      tipo: 'servicio',
      icono: 'document-lock'
    }
  ];

  // search.service.ts
  buscarServicios(termino: string): SearchResult[] {
    if (!termino.trim()) {
      return this.getServiciosDestacados();
    }

    const terminoNormalizado = this.normalizarTexto(termino);

    return this.servicios.filter(servicio =>
      this.normalizarTexto(servicio.titulo).includes(terminoNormalizado) ||
      this.normalizarTexto(servicio.descripcion).includes(terminoNormalizado) ||
      this.normalizarTexto(servicio.tipo).includes(terminoNormalizado)
    );
  }

  private normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // Elimina signos de puntuación
      .trim();
  }

  getServiciosDestacados(): SearchResult[] {
    return this.servicios.slice(0, 6);
  }

}