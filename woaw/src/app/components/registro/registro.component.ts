import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RegistroService } from '../../services/registro.service';
import { GeneralService } from '../../services/general.service';
import { FormBuilder, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import {
  AbstractControl,
  ValidatorFn,
  ValidationErrors,
  FormGroup,
} from '@angular/forms';

import { HttpClient } from '@angular/common/http';
import { AlertController } from '@ionic/angular';

import { ModalController } from '@ionic/angular';
import { PoliticasComponent } from '../../components/modal/politicas/politicas.component';
import { PopUpComponent } from '../../components/modal/pop-up/pop-up.component';
import { AvisoPrivasidadComponent } from '../../components/modal/aviso-privasidad/aviso-privasidad.component';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class RegistroComponent implements OnInit {
  paises: any[] = [];
  mostrarModal: boolean = false;
  ladaSeleccionada = {
    codigo: '+52',
    bandera: 'mx',
  };

  registroForm!: FormGroup;
  Seccionamostrar: number = 1;
  verPassword: boolean = false;

  public esDispositivoMovil: boolean = false;
  public dispositivo: string = '';

  filtroPais: string = '';

  mostrarAlertaPoliticas: boolean = false;
  MostrarCOntenido_Pop_Up: boolean = true;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private registroService: RegistroService,
    private alertController: AlertController,
    private generalService: GeneralService,
    private loadingController: LoadingController,
    private router: Router,
    private modalCtrl: ModalController
  ) {}

  async ngOnInit() {
    // localStorage.removeItem('popUp');
    // localStorage.removeItem('aviso');
    // localStorage.removeItem('terminos');

    this.generalService.dispositivo$.subscribe((tipo) => {
      this.esDispositivoMovil = tipo === 'telefono' || tipo === 'tablet';
      this.dispositivo = tipo;
    });
    // await this.mostrarPopUp();
    // ## -----
    this.inicializarFormulario();
    this.apiBanderas();
  }

  async mostrarPopUp() {
    const popUp = localStorage.getItem('popUp') === 'true';
    if (popUp) {
      this.MostrarCOntenido_Pop_Up = true;
      return;
    }

    let modal;

    if (this.dispositivo === 'telefono') {
      modal = await this.modalCtrl.create({
        component: PopUpComponent,
        backdropDismiss: true,
        showBackdrop: true,
        cssClass: 'modal-perfil',
        breakpoints: [0, 0.7, 1],
        initialBreakpoint: 0.7,
        handle: true,
      });
    } else {
      modal = await this.modalCtrl.create({
        component: PopUpComponent,
        backdropDismiss: true,
        showBackdrop: true,
        cssClass: 'modal-consentimiento',
      });
    }

    await modal.present();

    const { data } = await modal.onDidDismiss();
    this.popUpAceptado(data);
  }

  async popUpAceptado(valor: boolean) {
    if (valor) {
      localStorage.setItem('popUp', 'true');
      this.generalService.alert(
        'PopUp Aceptado',
        '¡Gracias por aceptar el PopUp! Ahora puedes continuar con tu registro.',
        'success'
      );
      this.MostrarCOntenido_Pop_Up = true;
    } else {
      console.error('El usuario no aceptó el PopUp');
    }
  }

  inicializarFormulario() {
    this.registroForm = this.fb.group(
      {
        usuario: [
          '',
          [
            Validators.required,
            Validators.maxLength(20),
            Validators.pattern(/^[A-Z ]+$/),
          ],
        ],
        apellidos: [
          '',
          [
            Validators.required,
            Validators.maxLength(40),
            Validators.pattern(/^[A-ZÑÁÉÍÓÚÜ ]+$/i),
          ],
        ],
        email: [
          '',
          [Validators.required, Validators.email, Validators.maxLength(30)],
        ],
        telefono: [
          '',
          [Validators.required, Validators.pattern(/^[0-9]{10}$/)],
        ],
        aviso: [false, Validators.requiredTrue],
        terminos: [false, Validators.requiredTrue],
        popup: [false, Validators.requiredTrue],
        numeroConfirm: [
          '',
          [
            Validators.required,
            Validators.maxLength(6),
            Validators.pattern(/^[0-9]{6}$/),
          ],
        ],
        contrasena: ['', [Validators.required, validarPasswordFuerte()]],
        confirmarContrasena: ['', [Validators.required]],
      },
      {
        validators: [
          validarCoincidenciaPasswords('contrasena', 'confirmarContrasena'),
        ],
      }
    );
  }

  transformarMayuscula(campo: string) {
    const valor = this.registroForm.get(campo)?.value;
    if (valor) {
      this.registroForm
        .get(campo)
        ?.setValue(valor.toUpperCase(), { emitEvent: false });
    }
  }

  // VALIDACION DE EMAIL, NUMERO DE TELEFONO Y NOMBRE
  async validarSeccion1() {
    const avisoAceptado = localStorage.getItem('aviso') === 'true';
    const terminosAceptados = localStorage.getItem('terminos') === 'true';

    if (!avisoAceptado) {
      this.registroForm.get('aviso')?.setValue(false);

      this.generalService.alert(
        'Aviso de Privacidad',
        'Debes aceptar el Aviso de Privacidad para continuar.',
        'warning'
      );
      return;
    }

    if (!terminosAceptados) {
      this.registroForm.get('terminos')?.setValue(false);

      this.generalService.alert(
        'Términos y Condiciones',
        'Debes aceptar los Términos y Condiciones para continuar.',
        'warning'
      );
      return;
    }

    const campos = ['usuario', 'apellidos', 'email', 'telefono'];
    let valido = true;

    campos.forEach((campo) => {
      const control = this.registroForm.get(campo);
      control?.markAsTouched();
      // console.log(`${campo}:`, control?.value);
      if (control?.invalid) {
        valido = false;
      }
    });

    if (valido) {
      // mostrar spinner
      await this.generalService.loading('Verificando...');
      const datos = {
        nombre: this.registroForm.value.usuario,
        apellidos: this.registroForm.value.apellidos,
        email: this.registroForm.value.email,
        lada: this.ladaSeleccionada.codigo,
        telefono: this.registroForm.value.telefono,
      };

      this.registroService.preregistro(datos).subscribe({
        next: async (respuesta) => {
          this.Seccionamostrar = 2;
          // ocultar spinner
          await this.generalService.loadingDismiss();
          await this.generalService.alert(
            '¡Estas a un paso de tu registro!',
            'Revisa tu correo para confirmar tu registro.',
            'success'
          );
          // this.registroForm.reset();
        },
        error: async (error) => {
          // Ocultar spinner
          await this.generalService.loadingDismiss();

          console.error('Error en el registro:', error);

          // Obtener mensaje del backend
          const mensaje =
            error.error?.message || 'Ocurrió un error. Intenta más tarde.';

          await this.generalService.alert(
            'Error al registrar',
            mensaje,
            'danger'
          );
        },
        complete: () => {
          this.generalService.loadingDismiss();
        },
      });
    } else {
      this.registroForm.markAllAsTouched();
      await this.generalService.alert(
        'Datos incompletos',
        'Ingresa tus datos en los campos correspondientes.',
        'warning'
      );
    }
  }

  // BOTON DE REGRESAR A SECCION 1 ←
  async regresarASeccion1() {
    const alert = await this.alertController.create({
      header: '¿Deseas regresar?',
      message: 'Perderás los datos ingresados en esta sección.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-cancel-button',
        },
        {
          text: 'Sí, regresar',
          handler: () => {
            this.Seccionamostrar = 1;
          },
          cssClass: 'alert-confirm-button',
        },
      ],
    });
    await alert.present();
  }

  // VALIDAR SECCIÓN DE CÓDIGO
  async validarSeccion2() {
    const campos = ['numeroConfirm'];
    let valido = true;

    campos.forEach((campo) => {
      const control = this.registroForm.get(campo);
      control?.markAsTouched();

      if (control?.invalid) {
        valido = false;
      }
    });

    if (valido) {
      // mostrar spinner
      await this.generalService.loading('Verificando...');
      const datos = {
        email: this.registroForm.value.email,
        code: String(this.registroForm.value.numeroConfirm),
      };

      this.registroService.validacioncodigo(datos).subscribe({
        next: async (respuesta) => {
          this.Seccionamostrar = 3;
          // ocultar spinner
          await this.generalService.loadingDismiss();
          await this.generalService.alert(
            '¡Código verificado exitosamente!',
            'Por favor crea una contrseña por seguridad',
            'success'
          );
          // this.registroForm.reset();
        },
        error: async (error) => {
          // Ocultar spinner
          await this.generalService.loadingDismiss();
          console.error('Error en el registro:', error);
          // Obtener mensaje del backend
          const mensaje =
            error.error?.message || 'Ocurrió un error. Intenta más tarde.';
          await this.generalService.alert(
            'Error al registrar',
            mensaje,
            'danger'
          );
        },
      });
    } else {
      this.registroForm.markAllAsTouched();
      await this.generalService.alert(
        'Datos incompletos',
        'Ingresa tus datos en los campos correspondientes.',
        'warning'
      );
    }
  }

  // REGISTRO DESPUES DE VALIDAR PASSWORD, EMAIL,  TELEFONO Y NOMBRE
  async EnvioRegistro() {
    const campos = ['usuario', 'apellidos', 'email', 'telefono'];
    let valido = true;

    campos.forEach((campo) => {
      const control = this.registroForm.get(campo);
      control?.markAsTouched();
      // console.log(`${campo}:`, control?.value);
      if (control?.invalid || control?.value.trim() === '') {
        valido = false;
      }
    });

    if (valido) {
      // mostrar spinner
      await this.generalService.loading('Verificando...');
      const datos = {
        nombre: this.registroForm.value.usuario,
        apellidos: this.registroForm.value.apellidos,
        email: this.registroForm.value.email,
        lada: this.ladaSeleccionada.codigo,
        telefono: this.registroForm.value.telefono,
        password: this.registroForm.value.contrasena,
      };

      this.registroService.registro(datos).subscribe({
        next: async (res) => {
          this.Seccionamostrar = 1;
          this.registroForm.reset();
          if (res.token && res.user) {
            this.generalService.guardarCredenciales(res.token, res.user);
            this.router.navigate(['/home']);
          } else {
            this.generalService.presentToast('Error en tu registro');
          }
          await this.generalService.loadingDismiss();
          await this.generalService.alert(
            '¡Bienvenido a Go Autos!',
            'Tu registro ha sido exitoso.',
            'success'
          );
        },
        error: async (error) => {
          // Ocultar spinner
          await this.generalService.loadingDismiss();
          console.error('Error en el registro:', error);
          let mensaje = 'Ocurrió un error. Intenta más tarde.';
          if (error.status === 400 && error.error?.mensaje) {
            mensaje = error.error.mensaje;
          }
          await this.generalService.alert(
            'Error al registrar',
            mensaje,
            'danger'
          );
        },
      });
    } else {
      this.registroForm.markAllAsTouched();
      await this.generalService.alert(
        'Datos incompletos',
        'Ingresa tus datos en los campos correspondientes.',
        'warning'
      );
    }
  }

  toggleVerPassword() {
    this.verPassword = !this.verPassword;
  }

  //  ##  ------

  apiBanderas() {
    this.http
      .get<any[]>(
        'https://restcountries.com/v3.1/all?fields=idd,flags,name,cca2'
      )
      .subscribe((data) => {
        this.paises = data
          .filter((p) => p.idd && p.idd.root)
          .map((p) => {
            const code = p.cca2.toLowerCase();
            return {
              nombre: p.name.common,
              codigo: `${p.idd.root}${p.idd.suffixes?.[0] || ''}`,
              bandera: this.getEmojiFlag(p.cca2),
              banderaUrl: `https://flagcdn.com/w40/${code}.png`,
            };
          })
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
  }

  getEmojiFlag(countryCode: string): string {
    return countryCode
      .toUpperCase()
      .replace(/./g, (char) =>
        String.fromCodePoint(127397 + char.charCodeAt(0))
      );
  }

  abrirModalLadas() {
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  seleccionarLada(pais: any) {
    this.ladaSeleccionada = {
      codigo: pais.codigo,
      bandera: pais.banderaUrl.split('/').pop()?.split('.')[0],
    };
    this.mostrarModal = false;
  }

  // ## ------ POLITICAS Y AVISO DE PRIVACIDAD ------ ##
  async ClickVer(event: Event, tipo: 'aviso' | 'terminos') {
    event.preventDefault();

    const modal = await this.modalCtrl.create({
      component:
        tipo === 'aviso' ? AvisoPrivasidadComponent : PoliticasComponent,
      componentProps: {},
      backdropDismiss: true,
      showBackdrop: true,
      ...(!this.esDispositivoMovil && {
        cssClass: 'modal-consentimiento',
      }),
      ...(this.esDispositivoMovil && {
        breakpoints: [0, 0.7, 1],
        initialBreakpoint: 0.7,
        handle: true,
      }),
    });
    await modal.present();
  }

  async onCheckboxClick(event: Event, tipo: 'aviso' | 'terminos') {
    event.preventDefault();

    const yaAceptado = localStorage.getItem(tipo) === 'true';

    if (yaAceptado) {
      this.registroForm.get(tipo)?.setValue(true);

      this.generalService.alert(
        tipo === 'aviso' ? 'Aviso de Privacidad' : 'Términos y Condiciones',
        'Has aceptado este documento.',
        'success'
      );

      return;
    }
    const modal = await this.modalCtrl.create({
      component:
        tipo === 'aviso' ? AvisoPrivasidadComponent : PoliticasComponent,
      componentProps: {
        onAceptar: () => this.setAceptado(tipo, true),
        onCancelar: () => this.setAceptado(tipo, false),
      },
      backdropDismiss: true,
      showBackdrop: true,
      ...(!this.esDispositivoMovil && {
        cssClass: 'modal-consentimiento',
      }),
      ...(this.esDispositivoMovil && {
        breakpoints: [0, 0.7, 1],
        initialBreakpoint: 0.7,
        handle: true,
      }),
    });

    await modal.present();
  }

  setAceptado(tipo: 'aviso' | 'terminos', valor: boolean) {
    if (valor === true) {
      localStorage.setItem(tipo, 'true');
    } else {
      const titulos: Record<typeof tipo, string> = {
        aviso: 'Aviso de Privacidad',
        terminos: 'Términos y Condiciones',
      };

      const mensajes: Record<typeof tipo, string> = {
        aviso:
          'Por tu seguridad y protección de datos, es necesario aceptar el Aviso de Privacidad para continuar.',
        terminos:
          'Debes aceptar los Términos y Condiciones para usar este servicio de forma segura y responsable.',
      };

      this.generalService.alert(titulos[tipo], mensajes[tipo], 'info');
    }

    this.registroForm.get(tipo)?.setValue(valor);
  }

  // -----
  async revisarCodigo() {
    const email = this.registroForm.get('email')?.value;
    if (email) {
      await this.generalService.loading('Verificando...');
      const datos = {
        nombre: this.registroForm.value.usuario,
        email: this.registroForm.value.email,
      };

      this.registroService.renvioCodigo(datos).subscribe({
        next: async (respuesta) => {
          await this.generalService.loadingDismiss();
          await this.generalService.alert(
            'Código reenviado',
            'Te hemos enviado nuevamente el código de verificación a tu correo. Revisa tu bandeja de entrada o spam.',
            'success'
          );
        },
        error: async (error) => {
          // Ocultar spinner
          await this.generalService.loadingDismiss();
          console.error('Error en el registro:', error);
          const mensaje =
            error.error?.message ||
            'No se pudo reenviar el código de verificación. Intenta más tarde o verifica tu dirección de correo.';
          await this.generalService.alert(
            'Error al reenviar código',
            mensaje,
            'danger'
          );
        },
        complete: () => {
          this.generalService.loadingDismiss();
        },
      });
    }
  }
}

function validarPasswordFuerte(): ValidatorFn {
  return (control: AbstractControl) => {
    const value = control.value || '';
    const errores: any = {};

    if (value.length < 6) {
      errores.minlength = true;
    }

    if (!/[A-Z]/.test(value)) {
      errores.mayuscula = true;
    }

    if (!/\d/.test(value)) {
      errores.numero = true;
    }

    if (!/[!@#$%^&*(),.?":{}|<>_]/.test(value)) {
      errores.especial = true;
    }

    return Object.keys(errores).length ? errores : null;
  };
}

function validarCoincidenciaPasswords(
  nombre1: string,
  nombre2: string
): ValidatorFn {
  return (form: AbstractControl) => {
    const group = form as FormGroup;
    const pass1 = group.get(nombre1)?.value;
    const pass2 = group.get(nombre2)?.value;

    if (pass1 !== pass2) {
      group
        .get(nombre2)
        ?.setErrors({ ...group.get(nombre2)?.errors, noCoincide: true });
    } else {
      const errores = group.get(nombre2)?.errors;
      if (errores) {
        delete errores['noCoincide'];
        if (Object.keys(errores).length === 0) {
          group.get(nombre2)?.setErrors(null);
        }
      }
    }

    return null;
  };
}
