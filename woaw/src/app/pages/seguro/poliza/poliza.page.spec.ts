import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PolizaPage } from './poliza.page';

describe('PolizaPage', () => {
  let component: PolizaPage;
  let fixture: ComponentFixture<PolizaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PolizaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
