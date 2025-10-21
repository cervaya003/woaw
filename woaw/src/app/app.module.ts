import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http'; // 👈 agrega HTTP_INTERCEPTORS

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { MenulateralComponent } from './components/menulateral/menulateral.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { TabsComponent } from './components/tabs/tabs.component';

// 👇 importa tu interceptor (ajusta la ruta si lo pusiste en otro lado)
import { AuthExpiryInterceptor } from './interceptors/auth-expiry-interceptor';


import { registerLocaleData } from '@angular/common';
import localeEsMX from '@angular/common/locales/es-MX';


registerLocaleData(localeEsMX);

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    MenulateralComponent,
    NavbarComponent,
    TabsComponent,
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // 👇 registra el interceptor
    { provide: HTTP_INTERCEPTORS, useClass: AuthExpiryInterceptor, multi: true },
    { provide: LOCALE_ID, useValue: 'es-MX' }
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
