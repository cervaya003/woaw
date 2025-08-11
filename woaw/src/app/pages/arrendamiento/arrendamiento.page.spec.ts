import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArrendamientoPage } from './arrendamiento.page';

describe('ArrendamientoPage', () => {
  let component: ArrendamientoPage;
  let fixture: ComponentFixture<ArrendamientoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ArrendamientoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
