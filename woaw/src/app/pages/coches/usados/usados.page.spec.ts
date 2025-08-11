import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsadosPage } from './usados.page';

describe('UsadosPage', () => {
  let component: UsadosPage;
  let fixture: ComponentFixture<UsadosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UsadosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
