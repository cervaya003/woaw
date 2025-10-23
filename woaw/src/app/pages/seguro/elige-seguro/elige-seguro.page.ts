import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SeguroService } from '../../../services/seguro.service';

@Component({
  selector: 'app-elige-seguro',
  templateUrl: './elige-seguro.page.html',
  styleUrls: ['./elige-seguro.page.scss'],
  standalone: false,
})
export class EligeSeguroPage implements OnInit {

  constructor(
    private router: Router,
    private seguros: SeguroService
  ) { }

  ngOnInit() {
  }

  public elegirSeguro(tipo: string, url: string) {
    if(tipo === 'Auto'){
      this.seguros.contador('entro');
    }
    localStorage.setItem('tipo-cotizar-manual', tipo);
    this.router.navigateByUrl(url);
  }
}
