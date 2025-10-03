import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerPolizasPage } from './ver-polizas.page';

describe('VerPolizasPage', () => {
  let component: VerPolizasPage;
  let fixture: ComponentFixture<VerPolizasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VerPolizasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
