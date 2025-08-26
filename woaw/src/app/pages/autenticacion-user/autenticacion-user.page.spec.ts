import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutenticacionUserPage } from './autenticacion-user.page';

describe('AutenticacionUserPage', () => {
  let component: AutenticacionUserPage;
  let fixture: ComponentFixture<AutenticacionUserPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AutenticacionUserPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
