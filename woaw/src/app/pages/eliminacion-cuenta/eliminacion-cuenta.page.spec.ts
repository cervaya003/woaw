import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EliminacionCuentaPage } from './eliminacion-cuenta.page';

describe('EliminacionCuentaPage', () => {
  let component: EliminacionCuentaPage;
  let fixture: ComponentFixture<EliminacionCuentaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EliminacionCuentaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
