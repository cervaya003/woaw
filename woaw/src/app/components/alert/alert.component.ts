import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, PopoverController } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { GeneralService } from '../../services/general.service';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AlertComponent implements OnInit {
  @Input() header!: string;
  @Input() message!: string;
  @Input() type: 'success' | 'danger' | 'warning' | 'info' = 'success';

  iconMap: { [key: string]: string } = {
    success: 'checkmark-circle-outline',
    danger: 'close-circle-outline',
    warning: 'warning-outline',
    info: 'information-circle-outline',
  };

  constructor(private popoverCtrl: PopoverController) {}

  ngOnInit() {}

  cerrar() {
    this.popoverCtrl.dismiss();
  }
}
