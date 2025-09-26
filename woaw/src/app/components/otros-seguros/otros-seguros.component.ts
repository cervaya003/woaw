import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-otros-seguros',
  templateUrl: './otros-seguros.component.html',
  styleUrls: ['./otros-seguros.component.scss'],
  standalone: true,  
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], 
})
export class OtrosSegurosComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
