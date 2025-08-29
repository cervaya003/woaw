import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisCamionesPage } from './mis-camiones.page';

describe('MisCamionesPage', () => {
  let component: MisCamionesPage;
  let fixture: ComponentFixture<MisCamionesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MisCamionesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
