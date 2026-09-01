import { Component, ElementRef, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { LotService } from '../../../core/services/lot.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppRoles } from '../../../core/models/app-roles';
import { CurrencyMaskDirective } from '../../../shared/directives/currency-mask.directive';
import { ToastService } from '../../../shared/services/toast.service';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { markAllAsTouched, scrollToFirstInvalid } from '../../../shared/utils/form-utils';

@Component({
  selector: 'app-lots',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, CurrencyMaskDirective, FieldErrorComponent, PaginationComponent],
  templateUrl: './lots.component.html',
  styleUrl: './lots.component.scss'
})
export class LotsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private lotService = inject(LotService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);

  get canCreate(): boolean {
    return this.authService.hasRole(AppRoles.ADMINISTRADOR);
  }

  projects: any[] = [];
  lots: any[] = [];
  selectedProjectId: number | null = null;
  activeProject: any = null; // Guardará todos los datos del proyecto seleccionado
  
  // KPIs específicos del proyecto
  projectTotalLots = 0;
  projectAvailableLots = 0;
  projectTotalValue = 0; // Suma del valor de los lotes

  // Control del UI
  isLoading = false;
  isModalOpen = false;
  errorMessage = '';
  hasProjectInRoute = false;
  pageSize = 10;
  currentPage = 1;

  get isGlobalView(): boolean {
    return !this.selectedProjectId;
  }

  get pagedLots(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.lots.slice(start, start + this.pageSize);
  }

  lotForm = this.fb.group({
    project_id: ['', Validators.required],
    number: ['', Validators.required],
    area_m2: ['', [Validators.required, Validators.min(1)]],
    list_price: ['', [Validators.required, Validators.min(0)]],
    price_m2: ['0'], // Valor por defecto si no lo usan manual
    status: ['disponible', Validators.required]
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const projectId = params['projectId'];

      if (projectId) {
        const selectedProjectId = Number(projectId);
        this.hasProjectInRoute = true;
        this.selectedProjectId = selectedProjectId;
        this.lotForm.patchValue({ project_id: selectedProjectId.toString() });
        this.activeProject = this.projects.find(p => p.id === selectedProjectId) ?? null;
        this.loadProjects();
        this.loadLots();
        return;
      }

      this.hasProjectInRoute = false;
      this.selectedProjectId = null;
      this.activeProject = null;
      this.lotForm.patchValue({ project_id: '' });
      this.loadProjects();
      this.loadLots();
    });
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        const data = response && typeof response === 'object' && 'data' in response ? response.data : response;
        this.projects = Array.isArray(data) ? data : Array.isArray((data as { data?: unknown })?.data) ? (data as { data: any[] }).data : [];

        if (this.selectedProjectId) {
          this.activeProject = this.projects.find(p => p.id === this.selectedProjectId);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando proyectos', err);
        this.projects = [];
        this.errorMessage = 'No se pudieron cargar los proyectos. Intente nuevamente.';
        this.cdr.detectChanges();
      }
    });
  }

  // Se dispara al elegir un proyecto en el select o al venir de la URL
  onProjectSelect(event: any) {
    this.currentPage = 1;
    const pId = Number(event.target.value);
    
    // Si eligen un proyecto, cambiamos la URL para mantener el estado
    if (pId) {
      this.router.navigate([], { queryParams: { projectId: pId } });
    } else {
      this.router.navigate([]); // Limpiamos URL
      this.selectedProjectId = null;
      this.activeProject = null;
      this.lots = [];
    }
  }

  // Función interna para cargar todo sobre un proyecto
  selectProject(projectId: number) {
    this.currentPage = 1;
    this.selectedProjectId = projectId;
    this.lotForm.patchValue({ project_id: projectId.toString() });
    
    // Buscamos los datos del proyecto (si ya cargaron)
    if (this.projects.length > 0) {
      this.activeProject = this.projects.find(p => p.id === projectId);
    }

    this.loadLots();
  }

  loadLots() {
    this.currentPage = 1;
    const request$ = this.selectedProjectId
      ? this.lotService.getLotsByProject(this.selectedProjectId)
      : this.lotService.getAllLots();

    request$.subscribe({
      next: (response) => {
        let allLots: any[] = [];
        const data = Array.isArray(response)
          ? response
          : response && typeof response === 'object' && 'data' in response
            ? response.data
            : undefined;

        if (Array.isArray(data)) {
          allLots = data;
        } else if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: unknown }).data)) {
          allLots = (data as { data: any[] }).data;
        }

        this.lots = allLots;

        if (this.selectedProjectId) {
          this.calculateProjectKPIs();
        } else {
          this.projectTotalLots = this.lots.length;
          this.projectAvailableLots = this.lots.filter(lot => {
            const status = typeof lot.status === 'object' ? (lot.status?.value || lot.status?.name) : lot.status;
            return String(status).toLowerCase().trim() === 'disponible';
          }).length;
          this.projectTotalValue = this.lots.reduce((sum, lot) => sum + Number(lot.list_price || 0), 0);
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando lotes', err);
        this.lots = [];
        this.cdr.detectChanges();
      }
    });
  }

  // --- MATEMÁTICAS DEL PROYECTO ---
  calculateProjectKPIs() {
    this.projectTotalLots = this.lots.length;
    this.projectAvailableLots = 0;
    this.projectTotalValue = 0;

    this.lots.forEach(lot => {
      // Precio acumulado
      this.projectTotalValue += Number(lot.list_price || 0);

      // Disponibilidad
      const statusStr = typeof lot.status === 'object' ? (lot.status?.value || lot.status?.name) : lot.status;
      const statusLimpio = String(statusStr).toLowerCase().trim();
      if (statusLimpio === 'available' || statusLimpio === 'disponible') {
        this.projectAvailableLots++;
      }
    });
  }

  // --- CONTROL DEL MODAL ---
  openModal() {
    this.isModalOpen = true;
    this.errorMessage = '';

    const projectId = this.selectedProjectId ?? this.lotForm.get('project_id')?.value;
    this.lotForm.patchValue({
      project_id: projectId ? String(projectId) : '',
      status: 'disponible'
    });
  }

  closeModal() {
    this.isModalOpen = false;
    this.lotForm.reset({
      project_id: this.selectedProjectId ? String(this.selectedProjectId) : '',
      status: 'disponible',
      price_m2: '0'
    });
  }

  // --- GUARDADO ---
  onSubmit() {
    if (this.lotForm.invalid) {
      markAllAsTouched(this.lotForm);
      scrollToFirstInvalid(this.host.nativeElement);
      this.toast.show('Formulario incompleto', 'error', 'Revisa los campos marcados en rojo');
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';

    // Si el usuario no mandó el price_m2, lo calculamos automáticamente (precio / area)
    const formValues = this.lotForm.value;
    if (!formValues.price_m2 || formValues.price_m2 === '0') {
       const area = Number(formValues.area_m2);
       const price = Number(formValues.list_price);
       if (area > 0) {
         formValues.price_m2 = (price / area).toString();
       }
    }

    this.lotService.createLot(formValues).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.closeModal();
        this.loadLots();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 422 && err.error?.errors) {
          const firstError = Object.keys(err.error.errors)[0];
          this.errorMessage = err.error.errors[firstError][0];
        } else {
          this.errorMessage = 'Error al registrar el lote.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}