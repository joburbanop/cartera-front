import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChartCardComponent } from './chart-card.component';

describe('ChartCardComponent', () => {
  let component: ChartCardComponent;
  let fixture: ComponentFixture<ChartCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChartCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Recaudo mensual');
    fixture.componentRef.setInput('type', 'bar');
    fixture.componentRef.setInput('labels', ['2026-08', '2026-09']);
    fixture.componentRef.setInput('datasets', [{ data: [1000, 2500] }]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('destruye la instancia al destruir el componente', () => {
    expect(() => fixture.destroy()).not.toThrow();
  });
});
