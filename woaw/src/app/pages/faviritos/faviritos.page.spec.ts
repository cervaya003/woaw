import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FaviritosPage } from './faviritos.page';

describe('FaviritosPage', () => {
  let component: FaviritosPage;
  let fixture: ComponentFixture<FaviritosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FaviritosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
