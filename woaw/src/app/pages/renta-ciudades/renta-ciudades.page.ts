import { Component, OnInit } from '@angular/core';

interface Ciudad {
  nombre: string;
  imagen: string;
  descripcion: string;
}

@Component({
  selector: 'app-renta-ciudades',
  templateUrl: './renta-ciudades.page.html',
  styleUrls: ['./renta-ciudades.page.scss'],
  standalone: false,
})
export class RentaCiudadesPage implements OnInit {
  ciudades: Ciudad[] = [
    {
      nombre: 'Cancún',
      imagen: '/assets/autos/publicidad/cancun.png',
      descripcion: 'Playas turquesa, zona hotelera y vida nocturna.',
    },
    {
      nombre: 'Guadalajara',
      imagen: '/assets/autos/publicidad/guadalajara.png',
      descripcion: 'Tradición, mariachi y crecimiento tecnológico.',
    },
    {
      nombre: 'Ciudad de México',
      imagen: '/assets/autos/publicidad/cdmx.png',
      descripcion: 'Negocios, montaña y gastronomía norteña.',
    },
    {
      nombre: 'Querétaro',
      imagen: '/assets/autos/publicidad/quere.png',
      descripcion: 'Centro histórico y polo industrial en crecimiento.',
    },
    
  ];

  // Opcional: útil si usas <ion-img> con srcset/sizes
  readonly sizes = '(min-width:1200px) 23vw, (min-width:820px) 30vw, 48vw';

  constructor() {}

  ngOnInit() {}

  trackByNombre = (_: number, item: Ciudad) => item.nombre;

  seleccionarCiudad(ciudad: Ciudad) {
    console.log('Ciudad seleccionada:', ciudad);
  }
}
