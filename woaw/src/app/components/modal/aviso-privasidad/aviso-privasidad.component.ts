import { Component, OnInit, Input, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, IonContent, ModalController } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-aviso-privasidad',
  templateUrl: './aviso-privasidad.component.html',
  styleUrls: ['./aviso-privasidad.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AvisoPrivasidadComponent implements OnInit {
  @Input() onAceptar!: () => void;
  @Input() onCancelar!: () => void;

  private readonly pdfPublicUrl =
    'https://storage.googleapis.com/wo-aw/docs/AVISO%20DE%20PRIVACIDAD.pdf';
  private readonly viewerUrlBase = 'https://docs.google.com/gview?embedded=true&url=';

  pdfUrlSafe!: SafeResourceUrl;

  mostrarFooter = false;
  scrollAlFinal = false;

  iframeVisible = false;

  @ViewChild('contenidoPrivacidad', { static: false }) contentRef!: IonContent;

  constructor(
    private modalCtrl: ModalController,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    const avisoAceptado = localStorage.getItem('aviso') === 'true';
    if (avisoAceptado) this.mostrarFooter = true;

    this.reloadIframe();
  }

  private reloadIframe() {
    this.iframeVisible = false;
    const viewerUrl =
      `${this.viewerUrlBase}${encodeURIComponent(this.pdfPublicUrl)}&v=${Date.now()}`;
    this.pdfUrlSafe = this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);

    setTimeout(() => {
      this.iframeVisible = true;
    }, 0);
  }

  async cerrarModal() {
    this.iframeVisible = false;
    this.pdfUrlSafe = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    this.modalCtrl.dismiss();
  }

  aceptar() {
    if (this.onAceptar) this.onAceptar();
    this.cerrarModal();
  }

  cancelar() {
    // if (this.onCancelar) this.onCancelar();
    this.cerrarModal();
  }

  async verificarScroll() {
    if (!this.contentRef) return;
    const el = await this.contentRef.getScrollElement();
    const haLlegadoAlFinal = el.scrollTop + el.offsetHeight >= el.scrollHeight - 20;
    if (haLlegadoAlFinal) this.scrollAlFinal = true;
  }
}