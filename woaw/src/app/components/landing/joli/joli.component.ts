import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-joli',
  templateUrl: './joli.component.html',
  styleUrls: ['./joli.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class JoliComponent implements OnInit {

  mensajes = [
    {
      titulo: 'Asesorías personalizadas para Modalidad 40',
      subtitulo: 'Recibe acompañamiento experto para aprovechar al máximo tu pensión.',
    },
    {
      titulo: 'Plan Personal de Retiro',
      subtitulo: 'Ahorra con ventajas fiscales y crecimiento disciplinado de largo plazo.'
    },
    {
      titulo: 'Mejorar tu futuro financiero',
      subtitulo: 'Construye estabilidad con planes de ahorro, inversión y seguridad.',
    },
    {
      titulo: 'Seguros',
      subtitulo: 'Protege tu bienestar y el de tu familia con soluciones a tu medida.',
    },
    {
      titulo: 'Afore y Pensiones',
      subtitulo: 'Optimiza tu cuenta AFORE y define la estrategia para una pensión estable.'
    },
    {
      titulo: 'Pensiones Modalidad 40',
      subtitulo: 'Accede a estrategias efectivas para aumentar tus ingresos al retirarte.',
    },
    {
      titulo: 'Crédito a Pensionados',
      subtitulo: 'Financiamiento con tasas preferenciales para pensionados IMSS/ISSSTE.'
    },
  ];

  indexActual = 0;
  intervalo: any;

  constructor() { }

  ngOnInit() {
    this.intervalo = setInterval(() => {
      this.indexActual = (this.indexActual + 1) % this.mensajes.length;
    }, 8000);
  }

  ngOnDestroy() {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
  }

}
