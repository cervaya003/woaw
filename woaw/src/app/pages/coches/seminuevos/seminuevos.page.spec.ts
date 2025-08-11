import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeminuevosPage } from './seminuevos.page';

describe('SeminuevosPage', () => {
  let component: SeminuevosPage;
  let fixture: ComponentFixture<SeminuevosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SeminuevosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
