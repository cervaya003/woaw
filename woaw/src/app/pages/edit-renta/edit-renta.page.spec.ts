import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditRentaPage } from './edit-renta.page';

describe('EditRentaPage', () => {
  let component: EditRentaPage;
  let fixture: ComponentFixture<EditRentaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditRentaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
