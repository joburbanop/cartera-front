import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { LotsComponent } from './lots.component';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

describe('LotsComponent', () => {
  let component: LotsComponent;
  let fixture: ComponentFixture<LotsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LotsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LotsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('abre la bitácora del lote para socio_gerencia', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === 'socio_gerencia');

    expect(component.canViewBitacora).toBe(true);

    component.openBitacora({ id: 12, number: 'L-01' });
    expect(component.isBitacoraOpen).toBe(true);
    expect(component.bitacoraSubjectType).toBe('lot');
    expect(component.bitacoraSubjectId).toBe(12);
  });
});
