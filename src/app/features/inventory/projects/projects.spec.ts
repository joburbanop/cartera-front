import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ProjectsComponent } from './projects.component';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectService } from '../../../core/services/project.service';
import { LotService } from '../../../core/services/lot.service';
import { DashboardService } from '../../../core/services/dashboard.service';

describe('ProjectsComponent', () => {
  let component: ProjectsComponent;
  let fixture: ComponentFixture<ProjectsComponent>;

  beforeEach(async () => {
    const projectServiceMock = {
      getProjects: vi.fn().mockReturnValue(of({
        data: [{
          id: 1,
          name: 'San Miguel',
          location: 'Bogotá',
          status: 'active',
          total_lots_count: 59,
          available_lots_count: 0,
          avance_ventas: 100,
        }],
      })),
    };

    const lotServiceMock = {
      getAllLots: vi.fn().mockReturnValue(of({
        data: Array.from({ length: 20 }, (_, index) => ({
          id: index + 1,
          project_id: 1,
          status: 'disponible',
        })),
      })),
    };

    const dashboardServiceMock = {
      getCarteraEnMora: vi.fn().mockReturnValue(of({ data: { total_vencido: 0 } })),
    };

    await TestBed.configureTestingModule({
      imports: [ProjectsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: LotService, useValue: lotServiceMock },
        { provide: DashboardService, useValue: dashboardServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('usa los conteos del backend y no recalcula desde la primera página de lotes', () => {
    const lotService = TestBed.inject(LotService);

    expect(lotService.getAllLots).not.toHaveBeenCalled();
    expect(component.projects[0].total_lots_count).toBe(59);
    expect(component.projectLotsStats[1]?.total).toBe(59);
    expect(component.projectLotsStats[1]?.available).toBe(0);
  });

  it('abre la bitácora del proyecto para socio_gerencia', () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(auth, 'hasRole').mockImplementation((role) => role === 'socio_gerencia');

    expect(component.canViewBitacora).toBe(true);

    component.openBitacora({ id: 3, name: 'San Miguel' });
    expect(component.isBitacoraOpen).toBe(true);
    expect(component.bitacoraSubjectType).toBe('project');
    expect(component.bitacoraSubjectId).toBe(3);
  });
});
