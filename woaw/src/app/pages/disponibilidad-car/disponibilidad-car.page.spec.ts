import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisponibilidadCarPage } from './disponibilidad-car.page';

describe('DisponibilidadCarPage', () => {
  let component: DisponibilidadCarPage;
  let fixture: ComponentFixture<DisponibilidadCarPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DisponibilidadCarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
