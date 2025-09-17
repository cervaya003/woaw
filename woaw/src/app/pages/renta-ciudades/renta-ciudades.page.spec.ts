import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RentaCiudadesPage } from './renta-ciudades.page';

describe('RentaCiudadesPage', () => {
  let component: RentaCiudadesPage;
  let fixture: ComponentFixture<RentaCiudadesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RentaCiudadesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
