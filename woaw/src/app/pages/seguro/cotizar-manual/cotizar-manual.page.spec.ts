import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CotizarManualPage } from './cotizar-manual.page';

describe('CotizarManualPage', () => {
  let component: CotizarManualPage;
  let fixture: ComponentFixture<CotizarManualPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CotizarManualPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
