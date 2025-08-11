import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisAutosPage } from './mis-autos.page';

describe('MisAutosPage', () => {
  let component: MisAutosPage;
  let fixture: ComponentFixture<MisAutosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MisAutosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
