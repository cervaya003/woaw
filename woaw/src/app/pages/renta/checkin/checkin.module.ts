import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CheckInPage } from './checkin.page';

@NgModule({
  declarations: [CheckInPage],
  imports: [
    CommonModule,
    FormsModule,      // <- NECESARIO para ngModel
    IonicModule,      // <- NECESARIO para componentes Ion*
    RouterModule.forChild([{ path: '', component: CheckInPage }]),
  ],
})
export class CheckInPageModule {}
