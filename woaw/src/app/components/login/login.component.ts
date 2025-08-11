import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RegistroService } from 'src/app/services/registro.service';
import { GeneralService } from '../../services/general.service';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  showPassword = false;
  loginForm: FormGroup;
  googleInitialized = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private toastController: ToastController,
    private registroService: RegistroService,
    private generalService: GeneralService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loginWithGoogle();
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      await this.generalService.alert(
        '¡Ups¡ Ha ocurrido un error',
        'Completa los campos correctamente',
        'danger'
      );
      return;
    }

    this.generalService.loading('Verificando...');
    const { email, password } = this.loginForm.value;

    this.registroService.login({ email, password }).subscribe({
      next: (res: any) => {
        this.generalService.loadingDismiss();
        if (res.token && res.user) {
          this.generalService.guardarCredenciales(res.token, res.user);
          this.router.navigate(['/home']);
          this.generalService.alert(
            'Bienvenido a Go Autos',
            'Inicio de sesión exitoso',
            'success'
          );
        } else {
          this.generalService.alert(
            'Error de conexión',
            'Ups, algo salió mal, vuelve a intentarlo',
            'danger'
          );
        }
      },
      error: () => {
        this.generalService.loadingDismiss();
        this.generalService.alert(
          '¡Ups! Verifica tus credenciales',
          'Email o contraseña incorrectos',
          'danger'
        );
      },
    });
  }

  loginWithGoogle() {
    if (!this.googleInitialized) {
      google.accounts.id.initialize({
        client_id:
          '986017802761-l0d5jsn1k2k0mb8g1okt42ipg84k067d.apps.googleusercontent.com',
        callback: (response: any) => {
          const idToken = response.credential;
          this.procesarLoginGoogle(idToken);
        },
        ux_mode: 'popup',
        context: 'signin',
      });

      google.accounts.id.renderButton(
        document.getElementById('google-button')!,
        {
          theme: 'outline',
          size: 'large',
        }
      );

      this.googleInitialized = true;
    } else {
      google.accounts.id.prompt();
    }
  }

  procesarLoginGoogle(idToken: string) {
    this.generalService.loading('Verificando...');
    this.registroService.loginConGoogle(idToken).subscribe({
      next: (res: any) => {
        this.generalService.loadingDismiss();
        if (res.token && res.user) {
          this.generalService.guardarCredenciales(res.token, res.user);
          this.router.navigate(['/home']);
          this.generalService.alert(
            'Bienvenido a Go Autos',
            'Inicio de sesión exitoso',
            'success'
          );
        } else {
          this.generalService.alert(
            'Error de conexión',
            'Ups, algo salió mal, vuelve a intentarlo',
            'danger'
          );
        }
      },
      error: () => {
        this.generalService.loadingDismiss();
        this.generalService.alert(
          '¡Ups! Error de conexión',
          'No se pudo iniciar sesión con Google, por favor intenta de nuevo.',
          'danger'
        );
      },
    });
  }
}
