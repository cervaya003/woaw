import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SegurosPage } from './seguros.page';

describe('SegurosPage', () => {
  let component: SegurosPage;
  let fixture: ComponentFixture<SegurosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SegurosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
