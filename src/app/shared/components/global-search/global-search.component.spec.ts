import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, delay } from 'rxjs';

import { GlobalSearchComponent } from './global-search.component';
import { SearchResults, SearchService } from '../../../core/services/search.service';

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('GlobalSearchComponent', () => {
  let component: GlobalSearchComponent;
  let fixture: ComponentFixture<GlobalSearchComponent>;
  let searchCalls: string[];
  let navigations: unknown[];

  const results: SearchResults = {
    clients: [{ id: 7, name: 'Ana Pérez', document_number: '123' }],
    contracts: [{ id: 11, contract_number: 'CTR-11', customer_name: 'Ana Pérez' }],
    lots: [{ id: 4, number: 'L-04', project_name: 'Norte', project_id: 2 }],
  };

  beforeEach(async () => {
    searchCalls = [];
    navigations = [];

    await TestBed.configureTestingModule({
      imports: [GlobalSearchComponent],
      providers: [
        {
          provide: SearchService,
          useValue: {
            search: (query: string) => {
              searchCalls.push(query);
              return of(results).pipe(delay(1));
            },
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: (...args: unknown[]) => {
              navigations.push(args);
              return Promise.resolve(true);
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debounce dispara la llamada solo con 2+ caracteres', async () => {
    component.query.setValue('a');
    await wait(350);
    expect(searchCalls).toEqual([]);

    component.query.setValue('an');
    await wait(250);
    expect(searchCalls).toEqual([]);

    await wait(100);
    expect(searchCalls).toEqual(['an']);
  });

  it('agrupa los resultados en clientes, contratos y lotes', async () => {
    component.query.setValue('ana');
    await wait(400);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Clientes');
    expect(text).toContain('Contratos');
    expect(text).toContain('Lotes');
    expect(text).toContain('Ana Pérez');
    expect(text).toContain('CTR-11');
    expect(text).toContain('L-04');
  });

  it('al hacer clic en un resultado navega y cierra el dropdown', async () => {
    component.query.setValue('ana');
    await wait(400);
    await fixture.whenStable();
    fixture.detectChanges();

    const hits = (fixture.nativeElement as HTMLElement).querySelectorAll('.search-hit');
    (hits[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(navigations[0]).toEqual([['/amortization', 11]]);
    expect(component.isOpen).toBeFalsy();
  });
});
