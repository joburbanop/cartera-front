import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { BankAccountService } from '../../../core/services/bank-account.service'; // Inyectamos las cuentas

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './projects.component.html',
})
export class ProjectsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private bankAccountService = inject(BankAccountService);
  private cdr = inject(ChangeDetectorRef);

  projects: any[] = [];
  availableBankAccounts: any[] = []; // Lista para pintar los checkboxes
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  // El formulario coincide con tu DTO en Laravel
  projectForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    location: ['', Validators.required],
    description: [''],
    bank_account_ids: this.fb.array([], Validators.required) // Exige al menos 1 cuenta
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadBankAccounts();
  }

  // Cargamos las cuentas para mostrarlas en el formulario
  loadBankAccounts() {
    this.bankAccountService.getAccounts().subscribe({
      next: (response) => {
        this.availableBankAccounts = response.data?.data || response.data || [];
        this.cdr.detectChanges();
      }
    });
  }

  // Cargamos los proyectos para la tabla de la derecha
  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        this.projects = response.data?.data || response.data || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando proyectos', err)
    });
  }

  // Función mágica para manejar los Checkboxes de Angular
  onCheckboxChange(e: any) {
    const bankAccountIds: FormArray = this.projectForm.get('bank_account_ids') as FormArray;
    
    if (e.target.checked) {
      // Si se marca, agregamos el ID al arreglo
      bankAccountIds.push(new FormControl(e.target.value));
    } else {
      // Si se desmarca, buscamos el ID y lo sacamos del arreglo
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

  onSubmit() {
    if (this.projectForm.invalid) {
      this.errorMessage = 'Por favor completa todos los campos requeridos y selecciona al menos una cuenta bancaria.';
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.projectService.createProject(this.projectForm.value).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Proyecto registrado exitosamente.';
        
        // Limpiamos todo
        this.projectForm.reset();
        (this.projectForm.get('bank_account_ids') as FormArray).clear(); 
        
        // Desmarcamos los checkboxes en el HTML manualmente reseteando el form base
        document.querySelectorAll('input[type=checkbox]').forEach((el: any) => el.checked = false);

        this.loadProjects(); 
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 422 && err.error?.errors) {
          const primerCampoConError = Object.keys(err.error.errors)[0];
          this.errorMessage = err.error.errors[primerCampoConError][0];
        } else {
          this.errorMessage = 'Hubo un error al registrar el proyecto.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}
