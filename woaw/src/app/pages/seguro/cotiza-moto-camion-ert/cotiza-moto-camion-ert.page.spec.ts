import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CotizaMotoCamionErtPage } from './cotiza-moto-camion-ert.page';

describe('CotizaMotoCamionErtPage', () => {
  let component: CotizaMotoCamionErtPage;
  let fixture: ComponentFixture<CotizaMotoCamionErtPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CotizaMotoCamionErtPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
