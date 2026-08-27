import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { BankAccountService } from '../../../core/services/bank-account.service';
import { LotService } from '../../../core/services/lot.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private bankAccountService = inject(BankAccountService);
  private cdr = inject(ChangeDetectorRef);
  private lotService = inject(LotService);

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
    bank_account_ids: this.fb.array([], Validators.required)
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadBankAccounts();
    this.loadLotsStats();
  }

  loadBankAccounts() {
    this.bankAccountService.getAccounts().subscribe({
      next: (response) => {
        this.availableBankAccounts = response.data?.data || response.data || [];
        this.cdr.detectChanges();
      }
    });
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        this.projects = response.data?.data || response.data || [];
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
  }

 // --- LÓGICA DE KPIS ---
  loadLotsStats() {
    this.lotService.getAllLots().subscribe({
      next: (response) => {
        let allLots: any[] = [];
        if (Array.isArray(response)) {
          allLots = response;
        } else if (response.data && Array.isArray(response.data)) {
          allLots = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          allLots = response.data.data;
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
      error: (err) => console.error('Error cargando estadísticas de lotes', err)
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
      this.errorMessage = 'Por favor completa todos los campos requeridos.';
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