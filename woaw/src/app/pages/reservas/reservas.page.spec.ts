import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReservasPage } from './reservas.page';

describe('ReservasPage', () => {
  let component: ReservasPage;
  let fixture: ComponentFixture<ReservasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReservasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
