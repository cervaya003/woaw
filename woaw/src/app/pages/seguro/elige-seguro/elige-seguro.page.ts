import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-elige-seguro',
  templateUrl: './elige-seguro.page.html',
  styleUrls: ['./elige-seguro.page.scss'],
  standalone: false,
})
export class EligeSeguroPage implements OnInit {

  constructor(
    private router: Router
  ) { }

  ngOnInit() {
  }

  public elegirSeguro(tipo: string, url: string) {
    localStorage.setItem('tipo-cotizar-manual', tipo);
    this.router.navigateByUrl(url);
  }
}
