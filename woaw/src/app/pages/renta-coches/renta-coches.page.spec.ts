import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RentaCochesPage } from './renta-coches.page';

describe('RentaCochesPage', () => {
  let component: RentaCochesPage;
  let fixture: ComponentFixture<RentaCochesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RentaCochesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
