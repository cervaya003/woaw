import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CochesSeminuevosComponent } from './coches-seminuevos.component';

describe('CochesSeminuevosComponent', () => {
  let component: CochesSeminuevosComponent;
  let fixture: ComponentFixture<CochesSeminuevosComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ CochesSeminuevosComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CochesSeminuevosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
