import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ClientDetailComponent } from './client-detail.component';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerService } from '../../../core/services/customer.service';
import { NavigationTrailService } from '../../../core/services/navigation-trail.service';
import { clientHub, clientesHub } from '../../../core/utils/navigation-trail';

describe('ClientDetailComponent', () => {
  let component: ClientDetailComponent;
  let fixture: ComponentFixture<ClientDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: '1' }) },
          },
        },
        {
          provide: CustomerService,
          useValue: {
            getCustomerById: () => of({
              data: {
                id: 1,
                name: 'Ana Pérez',
                nombre: 'Ana Pérez',
                documento: '123',
                contracts: [],
              },
            }),
          },
        },
        {
          provide: ActivityService,
          useValue: {
            getActivity: () => of({ data: [] }),
          },
        },
        {
          provide: AuthService,
          useValue: {
            hasRole: () => false,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('al abrir amortización lleva el rastro de la ficha del cliente', () => {
    expect(component.amortizationNavState()).toEqual(
      TestBed.inject(NavigationTrailService).state([
        clientesHub(),
        clientHub(1, 'Ana Pérez'),
      ]),
    );
  });
});
