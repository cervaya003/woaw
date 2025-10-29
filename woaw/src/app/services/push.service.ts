import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import {
  PushNotifications,
  PermissionStatus,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Device } from '@capacitor/device';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { HeadersService } from './headers.service';

@Injectable({ providedIn: 'root' })
export class PushService {
  private api = `${environment.api_key}`;
  private registeredToken?: string;

  constructor(
    private platform: Platform,
    private http: HttpClient,
    private router: Router,
    private headersSvc: HeadersService
  ) {}

  async init() {
    const info = await Device.getInfo();
    if (info.platform !== 'ios') return;

    const jwt = await this.headersSvc.obtenerToken();
    if (!jwt) return;

    const perm: PermissionStatus = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      const req = await PushNotifications.requestPermissions();
      if (req.receive !== 'granted') return;
    }

    try {
      await FirebaseMessaging.requestPermissions();
    } catch {}

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (_apns: Token) => {
      try {
        const fcm = await FirebaseMessaging.getToken();
        if (fcm?.token && fcm.token !== this.registeredToken) {
          await this.registerTokenServer(fcm.token);
        }
      } catch (e) {
        console.error('[Push] FCM token error', e);
      }
    });

    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        const data = action.notification?.data || {};
        this.handleDeepLink(data);
      }
    );

    FirebaseMessaging.addListener('tokenReceived', async (event) => {
      if (event?.token && event.token !== this.registeredToken) {
        await this.registerTokenServer(event.token);
      }
    });

    try {
      const fcm = await FirebaseMessaging.getToken();
      if (fcm?.token && fcm.token !== this.registeredToken) {
        await this.registerTokenServer(fcm.token);
      }
    } catch {}
  }

  // push.service.ts
  private async registerTokenServer(token: string) {
    const jwt = await this.headersSvc.obtenerToken();
    if (!jwt) return;

    const headers = this.headersSvc.getJsonHeaders(jwt);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.api}/push/register`,
          { token, platform: 'ios' },
          { headers }
        )
      );
      // ✅ GUARDA copia local para logout/desregistro
      this.registeredToken = token;
      localStorage.setItem('pushToken', token);
    } catch (e: any) {
      if (e?.status === 401) {
        console.warn('[Push] 401 registrando token (no loggeado)');
        return;
      }
      console.error('[Push] Error registrando token', e);
    }
  }

  // push.service.ts
  async unregister() {
    // ✅ intenta con el token en memoria o el guardado en local
    const tokenToUnreg =
      this.registeredToken || localStorage.getItem('pushToken') || undefined;
    if (!tokenToUnreg) return;

    const jwt = await this.headersSvc.obtenerToken();
    if (!jwt) {
      // Limpia local aunque no tengas JWT
      this.registeredToken = undefined;
      localStorage.removeItem('pushToken');
      try {
        await FirebaseMessaging.deleteToken();
      } catch {}
      return;
    }

    const headers = this.headersSvc.getJsonHeaders(jwt);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.api}/push/unregister`,
          { token: tokenToUnreg },
          { headers }
        )
      );
    } catch (e) {
      console.error('[Push] Error al desregistrar token', e);
    } finally {
      // ✅ limpia pase lo que pase
      this.registeredToken = undefined;
      localStorage.removeItem('pushToken');
      try {
        await FirebaseMessaging.deleteToken();
      } catch {}
    }
  }

  private handleDeepLink(data: Record<string, any>) {
    const carId = String(data['carId'] || '');
    if (carId) {
      this.router.navigateByUrl(`/ficha/autos/${carId}`);
      return;
    }
    this.router.navigateByUrl('/home');
  }
}
