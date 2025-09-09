import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NosotrosPage } from './nosotros.page';

describe('NosotrosPage', () => {
  let component: NosotrosPage;
  let fixture: ComponentFixture<NosotrosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NosotrosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
