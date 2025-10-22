import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Platform } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { AlertController } from '@ionic/angular';
import { LoadingController } from '@ionic/angular';
import { IonicModule, ToastController } from '@ionic/angular';
import { Observable, from } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { ModalController } from '@ionic/angular';
import { CustomAlertComponent } from '../components/custom-alert/custom-alert.component';
import { PopoverController } from '@ionic/angular';
import { AlertComponent } from '../components/alert/alert.component';
import { GeneralService } from '../services/general.service';
import { CarsService } from '../services/cars.service';
import { Router } from '@angular/router';
import { Share } from '@capacitor/share';
import { PopUpComponent } from '../components/modal/pop-up/pop-up.component';
import { HeadersService } from './headers.service';
import { switchMap, catchError } from 'rxjs/operators';
import { query } from '@angular/animations';

@Injectable({
  providedIn: 'root',
})
export class ContactosService {
  telefonoFijo: string = environment.telefonoFijo;
  telefonojoli: string = environment.telefonoJoli;
  telefonoArrendamiento: string = environment.telefonoArrendamiento;


  private sistemaOperativoSubject = new BehaviorSubject<string>('Desconocido');
  public sistemaOperativo$ = this.sistemaOperativoSubject.asObservable();

  public esDispositivoMovil: boolean = false;
  public dispositivo: string = '';
  public isLoggedIn: boolean = false;
  public MyRole: string | null = null;

  constructor(
    private platform: Platform,
    private http: HttpClient,
    private generalService: GeneralService,
    private router: Router,
    private carsService: CarsService,
    private headersService: HeadersService
  ) {
    this.generalService.tokenExistente$.subscribe((estado) => {
      this.isLoggedIn = estado;
    });
    this.generalService.tipoRol$.subscribe((rol) => {
      this.MyRole = rol;
    });
    // Detectar tipo de dispositivo
    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
      this.dispositivo = tipo;
    });
  }
  detectarSistemaOperativo() {
    const userAgent =
      navigator.userAgent || navigator.vendor || (window as any).opera;

    let sistema: string;

    if (/windows phone/i.test(userAgent)) {
      sistema = 'Windows Phone';
    } else if (/android/i.test(userAgent)) {
      sistema = 'Android';
    } else if (
      /iPad|iPhone|iPod/.test(userAgent) &&
      !(window as any).MSStream
    ) {
      sistema = 'iOS';
    } else if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(userAgent)) {
      sistema = 'macOS';
    } else if (/Win32|Win64|Windows|WinCE/.test(userAgent)) {
      sistema = 'Windows';
    } else if (/Linux/.test(userAgent)) {
      sistema = 'Linux';
    } else {
      sistema = 'Desconocido';
    }

    this.sistemaOperativoSubject.next(sistema);
  }
  async contactarDueno(
    numero: string,
    marca: string,
    modelo: string,
    anio: string,
    id: any,
    imagenUrl: string,
    tipo: string
  ): Promise<void> {
    const storage = localStorage.getItem('user');
    let nombreCompleto = '';

    if (!storage) {
      this.router.navigate(['/inicio']);
      this.generalService.alert(
        '¡Inicia sesión!',
        'Debes iniciar sesión para poder contactar con el vendedor.',
        'info'
      );
      return;
    }

    const usuario = JSON.parse(storage);
    nombreCompleto = `${usuario.nombre} ${usuario.apellidos}`.toUpperCase();

    const mensaje = encodeURIComponent(
      `Hola, le escribe un asesor de WOAW. Su vehículo ha generado interés:\n\n🚗 *${marca} ${modelo} ${anio}*\n\nConsulte su publicación:\n https://wo-aw.com/ficha/${tipo}/${id}`
    );

    const url = `https://api.whatsapp.com/send?phone=${this.telefonoFijo}&text=${mensaje}`;
    window.open(url, '_blank');
  }
  async contactarWOAW(
    auto: any,
    tipo_veiculo: string
  ): Promise<void> {
    // const popUp = localStorage.getItem('popUp') === 'true';
    // if (!popUp) {
    //   const modal = await this.modalCtrl.create({
    //     component: PopUpComponent,
    //     backdropDismiss: false,
    //     showBackdrop: true,
    //   });

    //   await modal.present();

    //   const { data } = await modal.onDidDismiss();
    //   this.popUpAceptado(data, marca, modelo, anio, id, tipo);
    // }

    this.popUpAceptado(auto, tipo_veiculo);
  }
  async popUpAceptado(
    auto: any,
    tipo_veiculo: string
  ) {
    // console.log(auto, tipo_veiculo)
    let telefonoVariable: string = '';

    var nombre: string | null = null
    var id: string | null = null

    const storage = localStorage.getItem('user');
    let nombreCompleto = '';

    if (storage) {
      try {
        const usuario = JSON.parse(storage);
        if (usuario.nombre && usuario.apellidos) {
          nombreCompleto =
            `${usuario.nombre} ${usuario.apellidos}`.toUpperCase();
        }
      } catch (error) {
        console.warn('Error al parsear el usuario del storage:', error);
        nombreCompleto = '';
      }
    }
    // 📌 Validación de a qué número enviar
    if (
      tipo_veiculo == 'motos'
    ) {
      // se va al jefe / NUMERO DE ARRENDAR
      telefonoVariable = environment.telefonoArrendamiento;
    } else if (
      auto.lote === null &&
      auto.usuarioId?.email === 'joel0558fonseca@gmail.com' &&
      auto.tipoVenta != 'nuevo'
    ) {
      // se va al jefe / NUMERO DE ARRENDAR
      telefonoVariable = environment.telefonoArrendamiento;
    } else if (
      tipo_veiculo == 'autos' &&
      auto.tipoVenta == 'nuevo'
    ) {
      // se va al jefe / NUMERO DE ARRENDAR
      telefonoVariable = environment.telefonoArrendamiento;
    } else if (
      auto.lote === null &&
      auto.usuarioId?.rol?.name === 'admin' &&
      auto.tipoVenta != 'nuevo'
    ) {
      // a WOAW
      telefonoVariable = environment.telefonoFijo;
    } else if (
      auto.lote === null &&
      auto.usuarioId?.rol?.name != 'admin'
    ) {
      // Dueño del auto
      telefonoVariable = `${auto.usuarioId?.lada}${auto.usuarioId?.telefono}`;
    } else if (
      auto.lote != null
    ) {
      nombre = auto.lote.nombre
      id = auto.lote._id
      // al lotero
      telefonoVariable = `+52${auto.lote?.telefonoContacto}`;
    }

    let mensaje = '';

    if (this.MyRole === 'admin' && this.isLoggedIn) {
      mensaje = encodeURIComponent(
        `Su vehículo ha generado interés en Woaw:\n\n` +
        `🚗 *${auto.marca} ${auto.modelo} ${auto.anio}*\n\n` +
        `🔗 https://wo-aw.com/ficha/${tipo_veiculo}/${auto._id}`
      );
    } else {
      mensaje = encodeURIComponent(
        `Hola${nombreCompleto ? `, soy ${nombreCompleto}` : ''}.\n\n` +
        `Estoy interesad@ en el siguiente vehículo:\n\n` +
        `🚗 *${auto.marca} ${auto.modelo} ${auto.anio}*\n\n` +
        `Les agradecería si pudieran brindarme más información.\n\n` +
        `🔗 https://wo-aw.com/ficha/${tipo_veiculo}/${auto._id}`
      );
    }

    this.envioContador(nombre, id);
    //    this.carsService.envio_notificacion(auto._id);

    const url = `https://api.whatsapp.com/send?phone=${telefonoVariable}&text=${mensaje}`;
    window.open(url, '_blank');
  }
  envioContador(nombre: string | null, id: string | null): void {

    // console.log(nombre, id);

    const rol = this.MyRole || 'desconocido';
    const baseUrl = `${environment.api_key}/contador`;

    const params = new URLSearchParams();
    params.set('rol', rol);

    if (nombre !== null && id !== null) {
      params.set('nombreLote', nombre);
      params.set('loteId', id);
    }

    const url = `${baseUrl}?${params.toString()}`;
    console.log(url)
    this.http.get(url).subscribe({
      next: (res) => {
        // console.log('✅ Contador enviado con éxito:', res);
      },
      error: (err) => {
        console.error('❌ Error al enviar contador:', err);
      },
    });
  }
  llamar() {
    window.location.href = `tel:${this.telefonoFijo}`;
  }
  async compartirAuto(auto: any, tipo: string) {
    const esNuevo = auto.tipoVenta === 'nuevo';

    let versionesTexto = '';
    if (Array.isArray(auto.version) && auto.version.length > 1) {
      versionesTexto = auto.version
        .map(
          (v: { Name: string; Precio: number }) =>
            `- ${v.Name}: $${v.Precio.toLocaleString()}`
        )
        .join('\n');
    } else if (Array.isArray(auto.version) && auto.version.length === 1) {
      versionesTexto = auto.version[0].Name;
    }

    const precioTexto =
      auto.precioDesde && auto.precioHasta
        ? esNuevo
          ? `💰 Precio: desde $${auto.precioDesde.toLocaleString()} hasta $${auto.precioHasta.toLocaleString()}`
          : `💰 Precio: $${auto.precioDesde.toLocaleString()}`
        : `💰 Precio: $${auto.precio?.toLocaleString() || 'N/D'}`;

    const texto =
      `🚗 *${auto.marca} ${auto.modelo} ${auto.anio}*\n` +
      (versionesTexto ? `🧩 Versiones:\n${versionesTexto}\n` : '') +
      `${precioTexto}\n` +
      `🔗 Ver en WOAW: https://wo-aw.com/ficha/${tipo}/${auto._id}`;

    try {
      await Share.share({
        title: `${auto.marca} ${auto.modelo} ${auto.anio}`,
        text: texto,
        dialogTitle: 'Compartir vehículo',
      });
    } catch (err) {
      console.error('Error al compartir:', err);
      // this.generalService.alert(
      //   'Error',
      //   'No se pudo compartir la información.',
      //   'danger'
      // );
    }
  }


  contactarPorPublicacionParticular(
    anioAuto: number | string,
    marcaAuto: string,
    modeloAuto: string,
    precioEstimado?: number,
    tipoFactura?: string
  ): void {
    // Validaciones básicas
    if (!anioAuto || !marcaAuto || !modeloAuto) {
      this.generalService?.alert?.(
        'Campos incompletos',
        'Por favor proporciona año, marca y modelo para poder contactar.',
        'warning'
      );
      return;
    }

    // Normaliza visual
    const anioTxt = String(anioAuto).trim();
    const marcaTxt = (marcaAuto || '').toString().trim();
    const modeloTxt = (modeloAuto || '').toString().trim();

    // Arma mensaje
    let mensaje =
      `Hola, me gustaría que me ayudaran a vender el siguiente vehículo:\n\n` +
      `🚗 *${marcaTxt} ${modeloTxt} (${anioTxt})*`;

    if (typeof precioEstimado === 'number' && !Number.isNaN(precioEstimado)) {
      mensaje += `\n💰 Precio estimado: *$${precioEstimado.toLocaleString('es-MX')}*`;
    }

    if (tipoFactura) {
      const facturaFmt = tipoFactura.charAt(0).toUpperCase() + tipoFactura.slice(1).toLowerCase();
      mensaje += `\n📄 Tipo de factura: *${facturaFmt}*`;
    }

    mensaje += `\n\nQuedo atento(a) a su respuesta. ¡Gracias!`;

    // Abre WhatsApp
    const phone = this.telefonoFijo; // Asegúrate que esté en formato internacional, p.ej. 521442XXXXXXX
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }




  // ARRENDAMIENTO
  enviarWhatsappInteresGeneral(): void {
    const storage = localStorage.getItem('user');
    let nombreCompleto = '';

    if (storage) {
      try {
        const usuario = JSON.parse(storage);
        if (usuario.nombre && usuario.apellidos) {
          nombreCompleto =
            `${usuario.nombre} ${usuario.apellidos}`.toUpperCase();
        }
      } catch (error) {
        console.warn('❌ Error al parsear el usuario del storage:', error);
      }
    }

    const mensaje = encodeURIComponent(
      nombreCompleto
        ? `Hola, soy *${nombreCompleto}*. Estoy interesad@ en obtener más información sobre el arrendamiento de autos.`
        : `Hola. Estoy interesad@ en obtener más información sobre el arrendamiento de autos.`
    );

    const url = `https://api.whatsapp.com/send?phone=${this.telefonoFijo}&text=${mensaje}`;

    window.open(url, '_blank');
  }
  ArrendamientoAuto(auto: any): void {
    if (!auto || !auto._id || !auto.tipoVenta) {
      console.warn('❌ Datos del auto inválidos.');
      return;
    }

    const storage = localStorage.getItem('user');
    let nombreCompleto = '';

    if (storage) {
      try {
        const usuario = JSON.parse(storage);
        if (usuario.nombre && usuario.apellidos) {
          nombreCompleto =
            `${usuario.nombre} ${usuario.apellidos}`.toUpperCase();
        }
      } catch (error) {
        console.warn('❌ Error al parsear el usuario del storage:', error);
      }
    }

    const linkAuto = `https://wo-aw.com/ficha/autos/${auto._id}`;

    const mensaje = encodeURIComponent(
      nombreCompleto
        ? `Hola, soy *${nombreCompleto}*. Estoy interesad@ en arrendar el siguiente coche:\n\n *${auto.marca} ${auto.modelo} ${auto.anio}*\n\n🔗 ${linkAuto}`
        : `Hola. Estoy interesad@ en arrendar el siguiente coche:\n\n *${auto.marca} ${auto.modelo} ${auto.anio}*\n\n ${linkAuto}`
    );

    this.carsService.envio_notificacion_arrendmiento();

    const url = `https://api.whatsapp.com/send?phone=${this.telefonojoli}&text=${mensaje}`;

    window.open(url, '_blank');
  }
  ArrendamientoAutoPge(modelo: string, marca: string): void {
    if (!modelo || !marca) {
      console.warn('❌ Datos del auto inválidos.');
      return;
    }

    const storage = localStorage.getItem('user');
    let nombreCompleto = '';

    if (storage) {
      try {
        const usuario = JSON.parse(storage);
        if (usuario.nombre && usuario.apellidos) {
          nombreCompleto =
            `${usuario.nombre} ${usuario.apellidos}`.toUpperCase();
        }
      } catch (error) {
        console.warn('❌ Error al parsear el usuario del storage:', error);
      }
    }

    this.carsService.envio_notificacion_arrendmiento();

    const mensaje = encodeURIComponent(
      nombreCompleto
        ? `Hola, mi nombre es *${nombreCompleto}*. \n\n Me gustaría recibir información sobre el arrendamiento del modelo *${modelo}* de la marca *${marca}*.`
        : `Hola. Estoy interesad@ en el arrendamiento del modelo *${modelo}* de la marca *${marca}*.`
    );

    const url = `https://api.whatsapp.com/send?phone=${this.telefonojoli}&text=${mensaje}`;

    window.open(url, '_blank');
  }

  // REDES SOCIALES
  RedesSociales(tipo: string): void {
    const sistema = this.sistemaOperativoSubject.getValue();
    const isMobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      this.platform.is('mobile') ||
      this.platform.is('mobileweb');

    let url = '';

    switch (tipo) {
      case 'whatsapp':
        url = `https://wa.me/${this.telefonoFijo}`;
        break;

      case 'facebook':
        url = `https://www.facebook.com/profile.php?id=61579193880952`;
        break;

      case 'instagram':
        url = `https://www.instagram.com/woaw.mx/`;
        break;

      case 'tiktok':
        url = `https://www.tiktok.com/@woaw.mx`;
        break;

      default:
        return;
    }

    window.open(url, '_blank');
  }
  envio_solicitus_credito(data: {
    coche: any;
    precio: any;
    version: string;
    enganche: number;
    enganchePercent: number;
    plazo: number;
    mensualidad: number;
    tasa: number;
  }): void {
    const storage = localStorage.getItem('user');
    let nombreCompleto = '';

    if (storage) {
      try {
        const usuario = JSON.parse(storage);
        if (usuario.nombre && usuario.apellidos) {
          nombreCompleto =
            `${usuario.nombre} ${usuario.apellidos}`.toUpperCase();
        }
      } catch (error) {
        console.warn('❌ Error al parsear el usuario del storage:', error);
      }
    }

    const coche = data.coche;
    const tipoVenta = coche.tipoVenta?.toUpperCase() ?? 'NO DEFINIDO';
    const marca = coche.marca ?? 'N/A';
    const modelo = coche.modelo ?? 'N/A';
    const anio = coche.anio ?? 'N/A';

    const version = data.version ?? 'SIN VERSIÓN';
    const precio = data.precio ?? 0;

    const urlCoche = window.location.href;

    const mensaje = encodeURIComponent(
      nombreCompleto
        ? `Hola, soy *${nombreCompleto}*. Estoy interesad@ en comprar este vehículo a *crédito*.\n\n` +
        `*${marca} ${modelo} ${anio}*\nVersión: *${version}*\nPrecio: *$${precio.toLocaleString()}*\nTipo de venta: *${tipoVenta}*\n\n` +
        `Enganche estimado: *$${data.enganche.toLocaleString()} (${data.enganchePercent
        }%)*\n` +
        `Mensualidad estimada: *$${data.mensualidad.toLocaleString()}* por *${data.plazo
        } meses*\n` +
        `Tasa estimada: *${(data.tasa * 100).toFixed(2)}%*\n\n` +
        `Aquí está el link del auto: ${urlCoche}`
        : `Hola. Estoy interesad@ en comprar este vehículo a *crédito*.\n\n` +
        `*${marca} ${modelo} ${anio}*\nVersión: *${version}*\nPrecio: *$${precio.toLocaleString()}*\nTipo de venta: *${tipoVenta}*\n\n` +
        `Enganche estimado: *$${data.enganche.toLocaleString()} (${data.enganchePercent
        }%)*\n` +
        `Mensualidad estimada: *$${data.mensualidad.toLocaleString()}* por *${data.plazo
        } meses*\n` +
        `Tasa estimada: *${(data.tasa * 100).toFixed(2)}%*\n\n` +
        `${urlCoche}`
    );

    this.carsService.envio_notificacion_cotizador();

    const url = `https://api.whatsapp.com/send?phone=${this.telefonoFijo}&text=${mensaje}`;
    window.open(url, '_blank');
  }

  // EMAIL Arrendamiento
  Enviar_Datos_email(datos: any): Observable<any> {
    return from(this.headersService.obtenerToken()).pipe(
      switchMap((token) => {
        const headers = this.headersService.getJsonHeaders(token);
        return this.http.post(
          `${environment.api_key}/contacto`,
          datos,
          { headers }
        );
      }),
      catchError((error) => this.headersService.handleError(error))
    );
  }
  Arrendamiento_enviarPorWhatsApp(body: any): void {
    // console.log('Datos para WhatsApp:', body);
    const storage = localStorage.getItem('user');
    let nombreCompleto = '';

    if (storage) {
      try {
        const usuario = JSON.parse(storage);
        if (usuario.nombre && usuario.apellidos) {
          nombreCompleto = `${usuario.nombre} ${usuario.apellidos}`.toUpperCase();
        }
      } catch (error) {
        console.warn('❌ Error al parsear el usuario del storage:', error);
      }
    }else{
      nombreCompleto = body.nombre;
    }

    // 🧩 Formatear versiones por modelo
    let vehiculosTexto = '';
    for (const vehiculo of body.vehiculos) {
      const nombreModelo = vehiculo.modelo?.modelo || 'Modelo desconocido';
      const versiones = Array.isArray(vehiculo.versiones)
        ? vehiculo.versiones.join(', ')
        : 'Sin versiones seleccionadas';
      vehiculosTexto += `\n🔹 *${nombreModelo}* (${versiones})`;
    }

    const mensaje = encodeURIComponent(
      (nombreCompleto ? `Hola, soy *${nombreCompleto}*.` : 'Hola.') +
      `\n\nEstoy interesad@ en el arrendamiento de la marca *${body.marca}*:` +
      `${vehiculosTexto}` +
      `\n\n📧 Correo: ${body.correo}` +
      `\n👤 Tipo de persona: ${body.tipoPersona}` +
      `\n📑 RFC: ${body.rfc}` +
      `\n📍 CP: ${body.cp}` +
      `\n📅 Plazo deseado: ${body.plazo} meses`
    );

    const url = `https://api.whatsapp.com/send?phone=${this.telefonoArrendamiento}&text=${mensaje}`;
    window.open(url, '_blank');
  }

  cotizaSeguro(data: {
    tipo?: string;
    marca: string;
    modelo: string;
    version: string;
    anio: string | number;
    nombre: string;
    correo: string;
    estadoCivil: string;
    fechaNacimiento: string;
    codigoPostal: string | number;
  }): void {
    const telefonoJefe = '+524424736940';
    const storage = localStorage.getItem('user');
    let nombreCompleto = '';

    if (storage) {
      try {
        const u = JSON.parse(storage);
        if (u?.nombre && u?.apellidos) nombreCompleto = `${u.nombre} ${u.apellidos}`.toUpperCase();
      } catch { }
    }

    const saludo = nombreCompleto ? `Hola, soy *${nombreCompleto}*.` : 'Hola.';
    const mensaje = encodeURIComponent(
      `${saludo}\n\nQuiero cotizar un *seguro* para:\n\n` +
      `🚗 *${data.marca} ${data.modelo} ${data.anio}*\n` +
      `🧩 Versión: *${data.version}*\n` +
      `📦 Tipo: *${data.tipo || 'auto'}*\n\n` +
      `👤 Nombre del cliente: *${data.nombre}*\n` +
      `📧 Correo: *${data.correo}*\n` +
      `❤️ Estado civil: *${data.estadoCivil}*\n` +
      `🎂 Fecha de nacimiento: *${data.fechaNacimiento}*\n` +
      `📮 Código postal: *${data.codigoPostal}*`
    );

    const url = `https://api.whatsapp.com/send?phone=${telefonoJefe}&text=${mensaje}`;
    window.open(url, '_blank');
  }
}
