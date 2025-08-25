import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-menu-vehiculos',
  templateUrl: './menu-vehiculos.page.html',
  styleUrls: ['./menu-vehiculos.page.scss'],
  standalone: false
})
export class MenuVehiculosPage implements OnInit {

  tipoVehiculo!: string;

constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.tipoVehiculo = this.route.snapshot.paramMap.get('tipo') || '';
  }

}
