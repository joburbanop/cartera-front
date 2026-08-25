import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LotService } from '../../../../core/services/lot.service';
import { ProjectService } from '../../../../core/services/project.service';

@Component({
  selector: 'app-crear-lote',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './crear-lote.component.html',
  styleUrls: ['./crear-lote.component.scss']
})
export class CrearLoteComponent implements OnInit {
  private fb = inject(FormBuilder);
  private lotService = inject(LotService);
  private projectService = inject(ProjectService);

  lotForm = this.fb.group({
    project_id: ['', Validators.required],
    number: ['', Validators.required],
    area_m2: ['', [Validators.required, Validators.min(0)]],
    price_m2: ['', [Validators.required, Validators.min(0)]],
    list_price: ['', [Validators.required, Validators.min(0)]],
  });

  projects: any[] = [];
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        this.projects = response?.data?.data ?? response?.data ?? response ?? [];
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los proyectos disponibles.';
      }
    });
  }

  onSubmit(): void {
    if (this.lotForm.invalid) {
      this.lotForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.lotService.createLot(this.lotForm.getRawValue()).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Lote creado correctamente.';
        this.lotForm.reset();
      },
      error: (err) => {
        this.isLoading = false;
        this.successMessage = '';

        const backendErrors = err?.error?.errors ?? null;
        const firstMessage = backendErrors
          ? Object.values(backendErrors).flat().find((msg: unknown) => typeof msg === 'string')
          : null;

        this.errorMessage = firstMessage
          ? String(firstMessage)
          : 'Hubo un error al registrar el lote.';

        console.error('Error al crear lote:', err);
      }
    });
  }
}
