import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoteEditPage } from './lote-edit.page';

describe('LoteEditPage', () => {
  let component: LoteEditPage;
  let fixture: ComponentFixture<LoteEditPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LoteEditPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
