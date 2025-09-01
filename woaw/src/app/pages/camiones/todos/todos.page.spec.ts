import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TodosPage } from './todos.page';

describe('TodosPage', () => {
  let component: TodosPage;
  let fixture: ComponentFixture<TodosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TodosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
