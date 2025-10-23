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

    // Información y Cuenta
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
    },
    {
      titulo: 'Eliminar Cuenta',
      descripcion: 'Eliminación de cuenta de usuario',
      ruta: '/eliminacion-cuenta',
      tipo: 'servicio',
      icono: 'person-remove'
    },
    {
      titulo: 'Mis Pólizas',
      descripcion: 'Ver mis pólizas de seguros',
      ruta: '/seguros/ver-polizas',
      tipo: 'servicio',
      icono: 'document-text'
    },
    {
      titulo: 'Crear Póliza',
      descripcion: 'Crear nueva póliza de seguro',
      ruta: '/seguros/poliza',
      tipo: 'servicio',
      icono: 'add-circle'
    },
    {
      titulo: 'Seguros para Autos',
      descripcion: 'Cotizar seguros para automóviles',
      ruta: '/seguros/autos',
      tipo: 'servicio',
      icono: 'car-sport'
    },
    {
      titulo: 'Seguros para Personas',
      descripcion: 'Seguros de vida y salud',
      ruta: '/seguros/persona',
      tipo: 'servicio',
      icono: 'person'
    },
    {
      titulo: 'Cotizar Seguro Manual',
      descripcion: 'Cotización manual de seguros',
      ruta: '/seguros/cotizar-manual',
      tipo: 'servicio',
      icono: 'calculator'
    },
    {
      titulo: 'Cotizar Moto/Camión',
      descripcion: 'Cotizar seguros para motos y camiones',
      ruta: '/seguros/cotiza/:tipo',
      tipo: 'servicio',
      icono: 'calculator'
    },
    {
      titulo: 'Detalle de Póliza',
      descripcion: 'Ver detalle de póliza',
      ruta: '/seguros/detalle-poliza',
      tipo: 'servicio',
      icono: 'document'
    },

    // Rentas y Reservas
    {
      titulo: 'Mis Reservas',
      descripcion: 'Ver mis reservas de renta',
      ruta: '/mis-reservas',
      tipo: 'servicio',
      icono: 'calendar'
    },
    {
      titulo: 'Check-in',
      descripcion: 'Check-in para renta de autos',
      ruta: '/checkin/:id',
      tipo: 'servicio',
      icono: 'log-in'
    },
    {
      titulo: 'Check-out',
      descripcion: 'Check-out para renta de autos',
      ruta: '/checkout/:id',
      tipo: 'servicio',
      icono: 'log-out'
    },

    // Gestión de Vehículos
    {
      titulo: 'Mis Autos',
      descripcion: 'Gestionar mis autos publicados',
      ruta: '/mis-autos',
      tipo: 'servicio',
      icono: 'car'
    },
    {
      titulo: 'Mis Motos',
      descripcion: 'Gestionar mis motos publicadas',
      ruta: '/mis-motos',
      tipo: 'servicio',
      icono: 'bicycle'
    },
    {
      titulo: 'Mis Camiones',
      descripcion: 'Gestionar mis camiones publicados',
      ruta: '/mis-camiones',
      tipo: 'servicio',
      icono: 'bus'
    },
    {
      titulo: 'Publicar Auto',
      descripcion: 'Publicar nuevo vehículo',
      ruta: '/new-car',
      tipo: 'servicio',
      icono: 'add'
    },
    {
      titulo: 'Editar Auto',
      descripcion: 'Editar vehículo publicado',
      ruta: '/update-car/:tipo/:id',
      tipo: 'servicio',
      icono: 'create'
    },

    // Favoritos y Mensajes
    {
      titulo: 'Favoritos',
      descripcion: 'Mis vehículos favoritos',
      ruta: '/favoritos',
      tipo: 'servicio',
      icono: 'heart'
    },
    {
      titulo: 'Mensajes',
      descripcion: 'Mis conversaciones',
      ruta: '/mensajes',
      tipo: 'servicio',
      icono: 'chatbubbles'
    }
  ];

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