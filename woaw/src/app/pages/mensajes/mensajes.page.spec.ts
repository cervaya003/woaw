import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MensajesPage } from './mensajes.page';

describe('MensajesPage', () => {
  let component: MensajesPage;
  let fixture: ComponentFixture<MensajesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MensajesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
