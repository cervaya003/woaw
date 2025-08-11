import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LotesPage } from './lotes.page';

describe('LotesPage', () => {
  let component: LotesPage;
  let fixture: ComponentFixture<LotesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LotesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
