import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ClientDetailComponent } from './client-detail.component';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { CustomerService } from '../../../core/services/customer.service';

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
});
