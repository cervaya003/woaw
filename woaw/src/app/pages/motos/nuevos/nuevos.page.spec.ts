import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevosPage } from './nuevos.page';

describe('NuevosPage', () => {
  let component: NuevosPage;
  let fixture: ComponentFixture<NuevosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NuevosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
