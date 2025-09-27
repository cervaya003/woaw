import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EligeSeguroPage } from './elige-seguro.page';

describe('EligeSeguroPage', () => {
  let component: EligeSeguroPage;
  let fixture: ComponentFixture<EligeSeguroPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EligeSeguroPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
