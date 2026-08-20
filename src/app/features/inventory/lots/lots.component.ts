import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { LotService } from '../../../core/services/lot.service';

@Component({
  selector: 'app-lots',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lots.component.html'
})
export class LotsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private lotService = inject(LotService);
  private cdr = inject(ChangeDetectorRef);

  projects: any[] = [];
  lots: any[] = [];
  selectedProjectId: number | null = null;
  
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  lotForm = this.fb.group({
    project_id: ['', Validators.required],
    number: ['', Validators.required],         // Cambiado de 'lot_number' a 'number'
    area_m2: ['', [Validators.required, Validators.min(1)]],  // Cambiado de 'area' a 'area_m2'
    list_price: ['', [Validators.required, Validators.min(0)]], // Cambiado de 'price' a 'list_price'
    price_m2: [0], // Lo calcularemos automáticamente o lo enviaremos en 0 para que Laravel lo procese
    status: ['disponible', Validators.required] // Cambiado de 'available' a 'disponible' (Enum del Backend)
  });


  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        this.projects = response.data?.data || response.data || [];
        this.cdr.detectChanges();
      }
    });
  }

  // Se dispara cuando el usuario cambia el proyecto en el select principal
  onProjectSelect(event: any) {
    this.selectedProjectId = event.target.value;
    this.lotForm.patchValue({ project_id: this.selectedProjectId?.toString() });
    
    if (this.selectedProjectId) {
      this.loadLots();
    } else {
      this.lots = [];
    }
  }

  loadLots() {
    if (!this.selectedProjectId) return;
    
    this.lotService.getLotsByProject(this.selectedProjectId).subscribe({
      next: (response) => {
        this.lots = response.data?.data || response.data || [];
        this.cdr.detectChanges();
      }
    });
  }

  onSubmit() {
    if (this.lotForm.invalid) return;
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.lotService.createLot(this.lotForm.value).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Lote registrado con éxito.';
        
        // Limpiamos el formulario pero MANTENEMOS el proyecto seleccionado y el estado por defecto
        this.lotForm.reset({ 
          project_id: this.selectedProjectId?.toString(),
          status: 'available' 
        }); 
        
        this.loadLots(); 
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