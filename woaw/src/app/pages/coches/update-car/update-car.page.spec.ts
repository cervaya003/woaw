import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpdateCarPage } from './update-car.page';

describe('UpdateCarPage', () => {
  let component: UpdateCarPage;
  let fixture: ComponentFixture<UpdateCarPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateCarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
