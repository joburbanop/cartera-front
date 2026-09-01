import { Component, ElementRef, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { BankAccountService } from '../../../core/services/bank-account.service';
import { LotService } from '../../../core/services/lot.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppRoles } from '../../../core/models/app-roles';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../../shared/services/toast.service';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { markAllAsTouched, requiredArray, scrollToFirstInvalid } from '../../../shared/utils/form-utils';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FieldErrorComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private bankAccountService = inject(BankAccountService);
  private cdr = inject(ChangeDetectorRef);
  private lotService = inject(LotService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);

  get canCreate(): boolean {
    return this.authService.hasRole(AppRoles.ADMINISTRADOR);
  }

  projects: any[] = [];
  availableBankAccounts: any[] = []; 
  
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  totalLots = 0;
  totalAvailableLots = 0;
  projectLotsStats: { [key: number]: { total: number, available: number } } = {}; 
  // Control del Modal
  isModalOpen = false;

  projectForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    location: ['', Validators.required],
    description: [''],
    bank_account_ids: this.fb.array([], requiredArray)
  });

  ngOnInit(): void {
    this.loadProjects();
    if (this.canCreate) {
      this.loadBankAccounts();
    }
    this.loadLotsStats();
  }

  loadBankAccounts() {
    this.bankAccountService.getAccounts().subscribe({
      next: (response) => {
        const responseData = Array.isArray(response)
          ? response
          : response && typeof response === 'object' && 'data' in response
            ? response.data
            : undefined;

        this.availableBankAccounts = Array.isArray(responseData)
          ? responseData
          : Array.isArray((responseData as { data?: unknown })?.data)
            ? (responseData as { data: any[] }).data
            : [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando cuentas bancarias', err);
        this.availableBankAccounts = [];
        this.errorMessage = 'No se pudieron cargar las cuentas bancarias. Intente nuevamente.';
        this.cdr.detectChanges();
      }
    });
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        const responseData = Array.isArray(response)
          ? response
          : response && typeof response === 'object' && 'data' in response
            ? response.data
            : undefined;

        this.projects = Array.isArray(responseData)
          ? responseData
          : Array.isArray((responseData as { data?: unknown })?.data)
            ? (responseData as { data: any[] }).data
            : [];
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

  onCheckboxChange(e: any) {
    const bankAccountIds: FormArray = this.projectForm.get('bank_account_ids') as FormArray;
    if (e.target.checked) {
      bankAccountIds.push(new FormControl(e.target.value));
    } else {
      let i: number = 0;
      bankAccountIds.controls.forEach((item: any) => {
        if (item.value == e.target.value) {
          bankAccountIds.removeAt(i);
          return;
        }
        i++;
      });
    }
    bankAccountIds.markAsDirty();
    bankAccountIds.markAsTouched();
    bankAccountIds.updateValueAndValidity();
  }

 // --- LÓGICA DE KPIS ---
  loadLotsStats() {
    this.lotService.getAllLots().subscribe({
      next: (response) => {
        let allLots: any[] = [];
        const data = Array.isArray(response)
          ? response
          : response?.data;

        if (Array.isArray(data)) {
          allLots = data;
        } else if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: unknown }).data)) {
          allLots = (data as { data: any[] }).data;
        }

        this.totalLots = allLots.length;
        this.totalAvailableLots = 0; // Reiniciamos
        this.projectLotsStats = {};  // Reiniciamos el diccionario

        allLots.forEach((lot: any) => {
          // Contabilidad para el KPI Global
          const statusStr = typeof lot.status === 'object' ? (lot.status?.value || lot.status?.name) : lot.status;
          const statusLimpio = String(statusStr).toLowerCase().trim();
          const isAvailable = (statusLimpio === 'available' || statusLimpio === 'disponible');
          
          if (isAvailable) {
            this.totalAvailableLots++;
          }

          // NUEVO: Contabilidad ESPECÍFICA por cada Proyecto
          const pId = lot.project_id;
          if (pId) {
            if (!this.projectLotsStats[pId]) {
              this.projectLotsStats[pId] = { total: 0, available: 0 };
            }
            this.projectLotsStats[pId].total++;
            
            if (isAvailable) {
              this.projectLotsStats[pId].available++;
            }
          }
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando estadísticas de lotes', err);
        this.toast.show('No se pudieron cargar las estadísticas de lotes.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  // --- LÓGICA DEL MODAL ---
  openModal() {
    this.isModalOpen = true;
    this.successMessage = '';
    this.errorMessage = '';
  }

  closeModal() {
    this.isModalOpen = false;
    this.projectForm.reset();
    (this.projectForm.get('bank_account_ids') as FormArray).clear();
    // Limpiar checkboxes físicos
    document.querySelectorAll('input[type=checkbox]').forEach((el: any) => el.checked = false);
  }

  onSubmit() {
    if (this.projectForm.invalid) {
      markAllAsTouched(this.projectForm);
      scrollToFirstInvalid(this.host.nativeElement);
      this.toast.show('Formulario incompleto', 'error', 'Revisa los campos marcados en rojo');
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.projectService.createProject(this.projectForm.value).subscribe({
      next: (response) => {
        this.isLoading = false;
        // Al guardar con éxito, cerramos el modal y recargamos la tabla
        this.closeModal(); 
        this.loadProjects();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 422 && err.error?.errors) {
          const primerError = Object.keys(err.error.errors)[0];
          this.errorMessage = err.error.errors[primerError][0];
        } else {
          this.errorMessage = 'Hubo un error al registrar el proyecto.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}