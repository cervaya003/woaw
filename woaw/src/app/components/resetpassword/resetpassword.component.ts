import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RegistroService } from '../../services/registro.service';
import { GeneralService } from '../../services/general.service';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms';
import { LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AbstractControl, ValidatorFn, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-resetpassword',
  templateUrl: './resetpassword.component.html',
  styleUrls: ['./resetpassword.component.scss'],
  standalone: true, // Si usando componentes independientes (standalone)
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], //esquema personalizado
})
export class ResetpasswordComponent implements OnInit {
  registroForm!: FormGroup;
  EstatusSeccion: number = 1;
  verPassword: boolean = false;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private registroService: RegistroService,
    private alertController: AlertController,
    private generalService: GeneralService,
    private loadingController: LoadingController,
    private router: Router
  ) {
    this.registroForm = this.fb.group(
      {
        email: [
          '',
          [Validators.required, Validators.email, Validators.maxLength(30)],
        ],
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
  ngOnInit() {}
  // REGISTRO DESPUES DE VALIDAR PASSWORD, EMAIL,  TELEFONO Y NOMBRE
  async EnvioRegistro() {
    const campos = ['contrasena', 'email'];
    let valido = true;

    campos.forEach((campo) => {
      const control = this.registroForm.get(campo);
      control?.markAsTouched();
      if (control?.invalid || control?.value.trim() === '') {
        valido = false;
      }
    });

    if (valido) {
      // mostrar spinner
      await this.generalService.loading('Verificando...');
      const datos = {
        email: this.registroForm.value.email,
        newPassword: this.registroForm.value.contrasena,
      };

      this.registroService.recuperacionFinal(datos).subscribe({
        next: async (res) => {
          await this.generalService.loadingDismiss();

          if (res.token && res.user) {
            this.generalService.guardarCredenciales(res.token, res.user);
            this.registroForm.reset();
            this.router.navigate(['/home']);
            this.generalService.presentToast(
              'Contraseña actualizada correctamente',
              'success'
            );
          } else {
            this.EstatusSeccion = 1;
            this.generalService.presentToast(
              'Error en tu recuperación de Contraseña Token no proporcionado',
              'danger'
            );
          }
        },
        error: async (error) => {
          // Ocultar spinner
          await this.generalService.loadingDismiss();
          console.error('Error en el registro:', error);
          let mensaje = 'Ocurrió un error. Intenta más tarde #Num 3.';
          if (error.status === 400 && error.error?.mensaje) {
            mensaje = error.error.mensaje;
          }
          this.EstatusSeccion = 1;
          await this.generalService.alert(
            'Error al registrar',
            mensaje,
            'danger'
          );
        },
      });
    } else {
      await this.generalService.loadingDismiss();
      this.registroForm.markAllAsTouched();
      await this.generalService.alert(
        'Datos incompletos',
        'Ingresa tus datos en los campos correspondientes.',
        'warning'
      );
    }
  }
  async validarSeccion1() {
    const campos = ['email'];
    let valido = true;

    campos.forEach((campo) => {
      const control = this.registroForm.get(campo);
      control?.markAsTouched();
      if (control?.invalid || control?.value.trim() === '') {
        valido = false;
      }
    });

    if (valido) {
      // mostrar spinner
      await this.generalService.loading('Verificando...');
      const datos = {
        email: this.registroForm.value.email,
      };

      this.registroService.recuperacionEmail(datos).subscribe({
        next: async (respuesta) => {
          this.EstatusSeccion = 2;
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
            error.error?.message ||
            'Ocurrió un error. Intenta más tarde #Num 1.';

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
  transformarMayuscula(campo: string) {
    const valor = this.registroForm.get(campo)?.value;
    if (valor) {
      this.registroForm
        .get(campo)
        ?.setValue(valor.toUpperCase(), { emitEvent: false });
    }
  }
  // BOTON DE REGRESAR A SECCION 1  ←
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
            this.EstatusSeccion = 1;
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

      this.registroService.recuperacioCodigo(datos).subscribe({
        next: async (respuesta) => {
          this.EstatusSeccion = 3;
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
          console.error('Error en el registro:', error);
          // Obtener mensaje del backend
          const mensaje =
            error.error?.message ||
            'Ocurrió un error. Intenta más tarde #Num 2.';
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
