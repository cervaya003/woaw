import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LotePage } from './lote.page';

describe('LotePage', () => {
  let component: LotePage;
  let fixture: ComponentFixture<LotePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LotePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
