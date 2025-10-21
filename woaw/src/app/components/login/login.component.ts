import { Component, OnInit, AfterViewInit, NgZone, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RegistroService } from 'src/app/services/registro.service';
import { GeneralService } from '../../services/general.service';
import { environment } from 'src/environments/environment';

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { PluginListenerHandle } from '@capacitor/core';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, AfterViewInit {
  @ViewChild('googleBtn', { static: false }) googleBtnRef?: ElementRef<HTMLDivElement>;

  showPassword = false;
  loginForm: FormGroup;
  googleInitialized = false;

  isNative = Capacitor.isNativePlatform();
  deepLink = 'woaw://auth/google';

  private urlListener?: PluginListenerHandle;
  private deepLinkHandled = false;
  private navDone = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private toastController: ToastController,
    private registroService: RegistroService,
    private generalService: GeneralService,
    private zone: NgZone
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  private b64urlToJson<T = any>(b64url: string): T {
    const base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  }

  private saveAndNavigate(token: string, user: any) {
    if (this.navDone) return;
    this.navDone = true;

    this.generalService.guardarCredenciales(token, user);
    let respuesta: boolean = this.verificaStorage();

    if (respuesta) {
      setTimeout(() => this.router.navigate(['/seguros/poliza']), 1200);
    } else {
      setTimeout(() => this.router.navigate(['/home']), 1200);
      this.generalService.alert('Bienvenido a WOAW', 'Inicio de sesión exitoso', 'success');
    }
  }

  ngOnInit(): void {
    if (this.isNative && !this.urlListener) {
      (async () => {
        this.urlListener = await App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
          this.zone.run(async () => {
            try {
              if (this.deepLinkHandled) return;
              this.deepLinkHandled = true;

              const url = new URL(event.url);

              const code = url.searchParams.get('code');
              if (code) {
                await Browser.close();
                const resp = await fetch(
                  `${environment.api_key}/auth/mobile/session?code=${encodeURIComponent(code)}`
                );
                if (!resp.ok) {
                  const err = await resp.json().catch(() => ({}));
                  throw new Error(err?.message || 'No se pudo canjear el código');
                }
                const { token, user } = await resp.json();
                this.saveAndNavigate(token, user);
                return;
              }

              const token = url.searchParams.get('token');
              const userB64 = url.searchParams.get('user');
              if (token && userB64) {
                await Browser.close();
                const user = this.b64urlToJson(userB64);
                this.saveAndNavigate(token, user);
                return;
              }

              this.generalService.alert('Error', 'URL de retorno inválida', 'danger');
            } catch (e) {
              console.error(e);
            }
          });
        });
      })();
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isNative) {
      await this.waitForGoogle();
      await this.renderGoogleButton();
    }
  }

  private waitForGoogle(timeoutMs = 8000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const ok = (window as any).google?.accounts?.id;
        if (ok) return resolve();
        if (Date.now() - start > timeoutMs) return reject(new Error('GIS no cargó'));
        requestAnimationFrame(check);
      };
      check();
    });
  }

  private async renderGoogleButton() {
    if (this.googleInitialized) return;
    if (!this.googleBtnRef?.nativeElement) return;

    google.accounts.id.initialize({
      client_id: '507962515113-5ual6shhg89dnor20a86jtp7ktgkrnm6.apps.googleusercontent.com',
      callback: (response: any) => {
        const idToken = response.credential;
        this.procesarLoginGoogle(idToken);
      },
      ux_mode: 'popup',
      context: 'signin',
    });

    google.accounts.id.renderButton(this.googleBtnRef.nativeElement, {
      theme: 'outline',
      size: 'large',
    });

    this.googleInitialized = true;
  }

  // ====== Tu lógica normal ======
  async onSubmit() {
    if (this.loginForm.invalid) {
      await this.generalService.alert('¡Ups¡ Ha ocurrido un error', 'Completa los campos correctamente', 'danger');
      return;
    }

    const { email, password } = this.loginForm.value;

    this.registroService.login({ email, password }).subscribe({
      next: (res: any) => {
        this.generalService.loadingDismiss();
        if (res.token && res.user) {
          this.generalService.guardarCredenciales(res.token, res.user);
          let respuesta: boolean = this.verificaStorage();

          if (respuesta) {
            setTimeout(() => this.router.navigate(['/seguros/poliza']), 1200);
          } else {
            setTimeout(() => this.router.navigate(['/home']), 1200);
            this.generalService.alert('Bienvenido a WOAW', 'Inicio de sesión exitoso', 'success');
          }
        } else {
          this.generalService.alert('Error de conexión', 'Ups, algo salió mal, vuelve a intentarlo', 'danger');
        }
      },
      error: () => {
        this.generalService.loadingDismiss();
        this.generalService.alert('¡Ups! Verifica tus credenciales', 'Email o contraseña incorrectos', 'danger');
      },
    });
  }

  procesarLoginGoogle(idToken: string) {
    this.registroService.loginConGoogle(idToken).subscribe({
      next: (res: any) => {
        this.generalService.loadingDismiss();
        if (res.token && res.user) {
          this.generalService.guardarCredenciales(res.token, res.user);
          let respuesta: boolean = this.verificaStorage();

          if (respuesta) {
            setTimeout(() => this.router.navigate(['/seguros/poliza']), 1200);
          } else {
            setTimeout(() => this.router.navigate(['/home']), 1200);
            this.generalService.alert('Bienvenido a WOAW', 'Inicio de sesión exitoso', 'success');
          }
        } else {
          this.generalService.alert(' Error en registro', 'Ups, algo salió mal, vuelve a intentarlo', 'danger');
        }
      },
      error: () => {
        this.generalService.loadingDismiss();
        this.generalService.alert('¡Ups! Error de conexión', 'No se pudo iniciar sesión con Google, por favor intenta de nuevo.', 'danger');
      },
    });
  }

  public verificaStorage(): boolean {
    const cotizacionRaw = localStorage.getItem('cotizacion');
    const usuarioRaw = localStorage.getItem('UsuarioRespuesta');

    const tieneCotizacion =
      cotizacionRaw !== null &&
      cotizacionRaw !== '' &&
      cotizacionRaw !== 'null' &&
      cotizacionRaw !== 'undefined';

    const tieneUsuario =
      usuarioRaw !== null &&
      usuarioRaw !== '' &&
      usuarioRaw !== 'null' &&
      usuarioRaw !== 'undefined';

    return tieneCotizacion && tieneUsuario;
  }

  // ANDROID (nativo)
  async loginWithGoogleMobile() {
    if (!Capacitor.isNativePlatform()) return;
    const platform = Capacitor.getPlatform() as 'ios' | 'android';
    const url = this.registroService.getGoogleMobileRedirectUrl(platform);
    await Browser.open({ url });
  }
  ngOnDestroy(): void {
    this.urlListener?.remove();
    this.urlListener = undefined;
  }
}