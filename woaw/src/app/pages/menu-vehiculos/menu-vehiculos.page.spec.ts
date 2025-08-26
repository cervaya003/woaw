import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuVehiculosPage } from './menu-vehiculos.page';

describe('MenuVehiculosPage', () => {
  let component: MenuVehiculosPage;
  let fixture: ComponentFixture<MenuVehiculosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MenuVehiculosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
