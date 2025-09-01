import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RentaFichaPage } from './renta-ficha.page';

describe('RentaFichaPage', () => {
  let component: RentaFichaPage;
  let fixture: ComponentFixture<RentaFichaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RentaFichaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
