import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisMotosPage } from './mis-motos.page';

describe('MisMotosPage', () => {
  let component: MisMotosPage;
  let fixture: ComponentFixture<MisMotosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MisMotosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
