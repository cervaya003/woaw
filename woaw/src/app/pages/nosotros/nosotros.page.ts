import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-nosotros',
  templateUrl: './nosotros.page.html',
  styleUrls: ['./nosotros.page.scss'],
  standalone: false
})
export class NosotrosPage implements AfterViewInit {
  @ViewChild('hero', { static: true }) hero!: ElementRef<HTMLElement>;
  @ViewChild(IonContent, { static: true }) content!: IonContent;

  kpiList = [
    { label: 'Clientes atendidos', valor: 1200 },
    { label: 'Publicaciones activas', valor: 850 },
    { label: 'Tiempo prom. de respuesta (min)', valor: 5 }
  ];

  historia = [
    { titulo: '2023 · Origen', desc: 'Nace la idea de ordenar el caos en clasificados de vehículos.' },
    { titulo: '2025 · MVP', desc: 'Lanzamiento del prototipo.' },
    { titulo: '2025 · Escala', desc: 'Módulos: autos, motos, camiones, seguros y arrendamiento.' }
  ];

  private io?: IntersectionObserver;

  ngAfterViewInit(): void {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          const num = (e.target as HTMLElement).querySelector('.kpi__num');
          if (num && !num.hasAttribute('data-done')) this.animateCount(num as HTMLElement);
          this.io?.unobserve(e.target);
        }
      });
    }, { threshold: prefersReduced ? 0.1 : 0.3 });

    document.querySelectorAll('.reveal').forEach((el) => this.io!.observe(el));
  }

  onScroll(ev: CustomEvent): void {
    const y = (ev.detail as any).scrollTop || 0;
    document.querySelectorAll('.parallax').forEach((el: any) => {
      el.style.transform = `translateY(${y * -0.06}px)`;
    });
  }

  private animateCount(el: HTMLElement): void {
    const target = Number(el.getAttribute('data-target') || '0');
    const dur = 900;
    const start = performance.now();
    const fmt = (v: number) => (target <= 9 ? Math.round(v) : Math.floor(v));
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      el.textContent = String(fmt(target * p));
      if (p < 1) requestAnimationFrame(step);
      else { el.textContent = String(target); el.setAttribute('data-done', '1'); }
    };
    requestAnimationFrame(step);
  }
}