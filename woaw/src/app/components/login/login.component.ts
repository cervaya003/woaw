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
import { SignInWithApple } from '@capacitor-community/apple-sign-in';

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
  isIOS = Capacitor.getPlatform() === 'ios';
isAndroid = Capacitor.getPlatform() === 'android';
loadingApple = false;

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


// === APPLE: utils ===
private async sha256Base64Url(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(buf);
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  const b64 = btoa(bin);
  // base64-url sin padding
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

private genRawNonce(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  array.forEach(n => (out += chars[n % chars.length]));
  return out;
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

    this.generalService.loading('Verificando...');
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
    this.generalService.loading('Verificando...');
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
  // === APPLE: login ===
async loginWithApple() {
  if (!this.isNative || !this.isIOS) return;

  try {
    this.loadingApple = true;
    this.generalService.loading('Verificando...');

    // 1) Nonce crudo para backend
    const rawNonce = this.genRawNonce(32);
    // 2) Apple requiere nonce SHA-256 en base64url
    const nonceHashed = await this.sha256Base64Url(rawNonce);

    // 3) Autorizar con Apple (Capacitor iOS)
   const res: any = await SignInWithApple.authorize({
  clientId: 'com.woaw.woaw', // tu bundleId (el mismo que en backend)
  redirectURI: 'https://appleid.apple.com/auth/callback', // solo por tipo, iOS nativo no lo usa
  scopes: 'FULL_NAME EMAIL',
  nonce: nonceHashed,
});

    const idToken: string | undefined = res?.response?.identityToken;
    if (!idToken) throw new Error('No se recibió id_token de Apple');

    const fullName = {
      givenName: res?.response?.givenName || null,
      familyName: res?.response?.familyName || null,
    };

    // 4) Enviar a tu backend EXACTO como lo espera
    const r = await this.http
      .post<{ token: string; user: any }>(
        `${environment.api_key}/auth/apple/login`,
        { idToken, platform: 'ios', fullName, rawNonce }
      )
      .toPromise();

    this.generalService.loadingDismiss();

    if (!r?.token || !r?.user) throw new Error('Respuesta inválida del backend');

    // 5) Guardar y navegar con tu misma lógica
    this.saveAndNavigate(r.token, r.user);
  } catch (e: any) {
    this.generalService.loadingDismiss();
    console.error('[Apple Login] error:', e?.message || e);
    this.generalService.alert('No se pudo iniciar sesión con Apple', e?.message || 'Intenta de nuevo', 'danger');
  } finally {
    this.loadingApple = false;
  }
}

  ngOnDestroy(): void {
    this.urlListener?.remove();
    this.urlListener = undefined;
  }
}