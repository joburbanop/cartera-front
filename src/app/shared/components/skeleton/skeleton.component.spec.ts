import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  let fixture: ComponentFixture<SkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonComponent);
  });

  it('renderiza el listado con el número de filas pedido', () => {
    fixture.componentRef.setInput('variant', 'table');
    fixture.componentRef.setInput('rows', 4);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.sk-table-row');
    expect(rows.length).toBe(4);
    expect(fixture.nativeElement.getAttribute('aria-label') || fixture.nativeElement.textContent).toBeDefined();
  });
});
