import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('totalItems', 25);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deshabilita Anterior en la página 1 y Siguiente en la última', () => {
    fixture.componentRef.setInput('currentPage', 1);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.pagination__btn') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(2);
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(false);

    fixture.componentRef.setInput('currentPage', 3);
    fixture.detectChanges();

    const lastPageButtons = fixture.nativeElement.querySelectorAll('.pagination__btn') as NodeListOf<HTMLButtonElement>;
    expect(lastPageButtons[0].disabled).toBe(false);
    expect(lastPageButtons[1].disabled).toBe(true);
  });
});
