import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent, NavController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-politicas',
  templateUrl: './politicas.page.html',
  styleUrls: ['./politicas.page.scss'],
  standalone: false
})
export class PoliticasPage implements OnInit {
  mostrarFooter = false;      // si ya aceptó, ocultamos footer
  scrollAlFinal = false;

  @ViewChild('contenidoPrivacidad', { static: false }) contentRef!: IonContent;

  constructor(private navCtrl: NavController, private router: Router) { }

  ngOnInit() {
    const terminosAceptados = localStorage.getItem('terminos') === 'true';
    this.mostrarFooter = terminosAceptados;
  }

  ionViewDidEnter() {
    // opcional: resetear al tope
    this.contentRef?.scrollToTop(0);
  }

  async verificarScroll() {
    const el = await this.contentRef.getScrollElement();
    const haLlegado =
      el.scrollTop + el.offsetHeight >= el.scrollHeight - 20;
    if (haLlegado) this.scrollAlFinal = true;
  }

  aceptar() {
    localStorage.setItem('terminos', 'true');
    this.mostrarFooter = true;
    // regresa a la pantalla anterior
    this.navCtrl.back();
    // o, si prefieres, redirige a un lugar específico:
    // this.router.navigateByUrl('/home', { replaceUrl: true });
  }

  cancelar() {
    this.navCtrl.back();
  }
}
