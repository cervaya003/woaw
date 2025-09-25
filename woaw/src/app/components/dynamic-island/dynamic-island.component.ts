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


@Component({
  selector: 'app-dynamic-island',
  templateUrl: './dynamic-island.component.html',
  styleUrls: ['./dynamic-island.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, HttpClientModule],
})
export class DynamicIslandComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}