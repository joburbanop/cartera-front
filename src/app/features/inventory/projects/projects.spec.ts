import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectsComponent } from './projects.component';
import { AuthService } from '../../../core/services/auth.service';

describe('ProjectsComponent', () => {
  let component: ProjectsComponent;
  let fixture: ComponentFixture<ProjectsComponent >;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsComponent  ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
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
