import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ContractService } from '../../../core/services/contract.service';
import { ProjectService } from '../../../core/services/project.service';
import { LotService } from '../../../core/services/lot.service';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contracts.component.html',
  styleUrl: './contracts.component.scss'
})
export class ContractsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private contractService = inject(ContractService);
  private projectService = inject(ProjectService);
  private lotService = inject(LotService);
  private cdr = inject(ChangeDetectorRef);

  contracts: any[] = [];
  customers: any[] = []; 
  projects: any[] = [];
  availableLots: any[] = []; 
  
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  // Variables para KPIs
  totalContracts = 0;
  totalPortfolioValue = 0;


  // Control del Modal
  isModalOpen = false;

  contractForm = this.fb.group({
    contract_number: ['', Validators.required],
    customer_id: ['', Validators.required],
    project_id: [''], // Auxiliar
    lot_id: ['', Validators.required],
    seller_name: [''], 
    sale_price: ['', [Validators.required, Validators.min(1)]],
    down_payment_pactada: ['', [Validators.required, Validators.min(0)]],
    term_months: ['', [Validators.required, Validators.min(1)]],
    interest_rate: ['1.00', [Validators.required, Validators.min(0)]],
    start_date: ['', Validators.required]
  });

  calculateKPIs() {
    this.totalContracts = this.contracts.length;
    this.totalPortfolioValue = this.contracts.reduce((sum, contract) => {
      return sum + Number(contract.sale_price || 0);
    }, 0);
  }

  openModal() {
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModal() {
    this.isModalOpen = false;
    this.contractForm.reset();
  }

  ngOnInit(): void {
    this.loadContracts();
    this.loadProjects();

    // VIGILANTE REACTIVO: Escucha cada vez que cambia el select de proyecto
    this.contractForm.get('project_id')?.valueChanges.subscribe(projectId => {
      // 1. Reseteamos el lote elegido y la lista
      this.contractForm.patchValue({ lot_id: '' }, { emitEvent: false });
      this.availableLots = [];

      if (!projectId) return;

      // 2. Pedimos los lotes a Laravel
      // 2. Pedimos los lotes a Laravel
      this.lotService.getLotsByProject(Number(projectId)).subscribe({
        next: (response) => {
          // Extraemos el arreglo inteligente
          let allLots: any[] = [];
          if (Array.isArray(response)) {
            allLots = response;
          } else if (response.data && Array.isArray(response.data)) {
            allLots = response.data;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            allLots = response.data.data;
          }

          console.log('Total de lotes recibidos:', allLots);

          // INVESTIGACIÓN: Imprimimos exactamente cómo viene el estado del primer lote
          if (allLots.length > 0) {
            console.log('🔍 ESTADO CRUDO DEL LOTE 1:', allLots[0].status);
          }

          // Filtramos (ampliamos las opciones por si acaso)
          this.availableLots = allLots.filter((lot: any) => {
            const statusStr = typeof lot.status === 'object' ? (lot.status?.value || lot.status?.name) : lot.status;
            const statusLimpio = String(statusStr).toLowerCase().trim();
            
            return statusLimpio === 'available' || statusLimpio === 'disponible';
          });

          // 🚨 SALVAVIDAS: Si el filtro los oculta todos, pero SÍ existen lotes en el proyecto,
          // mostramos todos temporalmente para que tu Select funcione y puedas guardar el contrato.
          if (this.availableLots.length === 0 && allLots.length > 0) {
            console.warn('⚠️ El filtro falló. Mostrando todos los lotes temporalmente.');
            this.availableLots = allLots;
          }

          console.log('Lotes que se mostrarán en el Select:', this.availableLots);
          this.cdr.detectChanges(); // Repintamos la pantalla
        },
        error: (err) => console.error('Error cargando lotes:', err)
      });
    });
  }

  loadContracts() {
    this.contractService.getContracts().subscribe({
      next: (response) => {
        this.contracts = response.data?.data || response.data || [];
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

  onSubmit() {
    if (this.contractForm.invalid) {
      this.errorMessage = 'Por favor, complete todos los campos obligatorios.';
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const { project_id, ...contractData } = this.contractForm.value;

    this.contractService.createContract(contractData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Contrato registrado exitosamente.';
        
        // Limpiamos todo el formulario, devolviendo la tasa a 1.00
        this.contractForm.reset({ interest_rate: '1.00', project_id: '' }); 
        
        // Como el reset dispara el valueChanges del project_id con un string vacío, 
        // la lista de lotes se vaciará sola de forma segura.
        
        this.loadContracts(); 
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 422 && err.error?.errors) {
          const firstError = Object.keys(err.error.errors)[0];
          this.errorMessage = err.error.errors[firstError][0];
        } else {
          this.errorMessage = 'Hubo un error al registrar el contrato.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}