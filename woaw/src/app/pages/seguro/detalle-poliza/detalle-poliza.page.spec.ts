import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetallePolizaPage } from './detalle-poliza.page';

describe('DetallePolizaPage', () => {
  let component: DetallePolizaPage;
  let fixture: ComponentFixture<DetallePolizaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetallePolizaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
