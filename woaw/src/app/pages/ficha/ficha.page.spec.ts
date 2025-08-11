import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FichaPage } from './ficha.page';

describe('FichaPage', () => {
  let component: FichaPage;
  let fixture: ComponentFixture<FichaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FichaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
