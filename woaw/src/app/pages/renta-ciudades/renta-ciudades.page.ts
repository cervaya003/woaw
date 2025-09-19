import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface Ciudad {
  nombre: string;
  imagen: string;
  disponible: boolean;
}

@Component({
  selector: 'app-renta-ciudades',
  templateUrl: './renta-ciudades.page.html',
  styleUrls: ['./renta-ciudades.page.scss'],
  standalone: false,
})
export class RentaCiudadesPage implements OnInit {
  ciudades: Ciudad[] = [
    { nombre: 'Cancún',           imagen: '/assets/autos/publicidad/cancun.png', disponible: true },
    { nombre: 'Guadalajara',      imagen: '/assets/autos/publicidad/guadalajara.png', disponible: false},
    { nombre: 'Ciudad de México', imagen: '/assets/autos/publicidad/cmx.png', disponible: false},
    { nombre: 'Querétaro',        imagen: '/assets/autos/publicidad/q.png',disponible: false },
  ];


  readonly sizes = '(min-width:1200px) 23vw, (min-width:820px) 30vw, 48vw';

  constructor(private router: Router) {}

  ngOnInit() {}

  trackByNombre = (_: number, item: Ciudad) => item.nombre;

  seleccionarCiudad(ciudad: Ciudad) { 
    this.router.navigate(['/renta-coches'], {
      queryParams: { ciudad: ciudad.nombre }
    });
  }

  redirecion(url: string) {
    this.router.navigate([url]);
  }

  isActive(ruta: string): boolean {
    const url = this.router.url;
    if (ruta === 'home') {
      return url === '/home' || url === '/';
    }
    return url === `/${ruta}` || url.startsWith(`/${ruta}/`);
  }
}
