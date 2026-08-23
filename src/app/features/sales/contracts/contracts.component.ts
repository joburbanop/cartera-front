import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ContractService } from '../../../core/services/contract.service';
import { ProjectService } from '../../../core/services/project.service';
import { LotService } from '../../../core/services/lot.service';
import { CustomerService, Customer } from '../../../core/services/customer.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FinancialService } from '../../../core/services/financial.service';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './contracts.component.html',
  styleUrl: './contracts.component.scss'
})
export class ContractsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private contractService = inject(ContractService);
  private projectService = inject(ProjectService);
  private lotService = inject(LotService);
  private customerService = inject(CustomerService);
  private cdr = inject(ChangeDetectorRef);
  private financialService = inject(FinancialService);
  private route = inject(ActivatedRoute);

  contracts: any[] = [];
  customers: Customer[] = [];
  projects: any[] = [];
  availableLots: any[] = []; 
  selectedLotId: number | null = null;
  selectedLot: any = null;
  
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  projectedQuota: number = 0;
  projectedTotal: number = 0;


  // Variables para KPIs
  totalContracts = 0;
  totalPortfolioValue = 0;


  // Control del Modal
  isModalOpen = false;
  showCustomerModal = false;

  customerForm = this.fb.group({
    name: ['', Validators.required],
    document: ['', Validators.required],
    phone: [''],
    email: ['', [Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/)]],
  });

  contractForm = this.fb.group({
    contract_number: ['', Validators.required],
    customer_id: ['', Validators.required],
    project_id: ['', Validators.required],
    lot_id: ['', Validators.required],
    seller_name: [''],
    sale_price: [null, [Validators.required, Validators.min(0)]],
    down_payment_pactada: [null, [Validators.required, Validators.min(0)]],
    term_months: [null, [Validators.required, Validators.min(1)]],
    interest_rate: [1.00, [Validators.required, Validators.min(0)]],
    start_date: ['', Validators.required],
    down_payment_date: ['', Validators.required],
    first_installment_date: ['', Validators.required],
    preventa_stages: [7, [Validators.required, Validators.min(0)]]
  });

  calculateKPIs() {
    this.totalContracts = this.contracts.length;
    this.totalPortfolioValue = this.contracts.reduce((sum, contract) => {
      return sum + Number(contract.sale_price || 0);
    }, 0);
  }
  alculatePreview(values: any) {
    const salePrice = Number(values.sale_price) || 0;
    const downPayment = Number(values.down_payment_pactada) || 0;
    const months = Number(values.term_months) || 0;
    const interestRate = Number(values.interest_rate) || 0;

    const principal = salePrice - downPayment;

    // Llamamos al servicio Core para hacer la matemática pesada
    this.projectedQuota = this.financialService.calculateFrenchQuota(principal, months, interestRate);
    this.projectedTotal = this.financialService.calculateProjectedTotal(this.projectedQuota, months, downPayment);
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
    this.route.queryParamMap.subscribe(params => {
      const lotId = params.get('lotId');
      this.selectedLotId = lotId ? Number(lotId) : null;
      this.loadContracts();
    });

    this.loadCustomers();
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

          this.availableLots = allLots.filter((lot: any) => {
            const statusStr = typeof lot.status === 'object' ? (lot.status?.value || lot.status?.name) : lot.status;
            const statusLimpio = String(statusStr).toLowerCase().trim();

            return statusLimpio === 'available' || statusLimpio === 'disponible';
          });

          console.log('Lotes disponibles para contrato:', this.availableLots);
          this.cdr.detectChanges(); // Repintamos la pantalla
        },
        error: (err) => console.error('Error cargando lotes:', err)
      });
    });
    this.contractForm.valueChanges.subscribe(values => {
      this.calculatePreview(values);
    });
  }

  private applyLotFilter(): void {
    if (!this.selectedLotId) {
      this.selectedLot = null;
      return;
    }

    const filtered = this.contracts.filter((contract: any) => {
      const contractLotId = Number(contract.lot_id ?? contract.lot?.id ?? 0);
      return contractLotId === this.selectedLotId;
    });

    this.contracts = filtered;
    this.selectedLot = filtered[0]?.lot ?? { id: this.selectedLotId };
  }

  loadContracts() {
    this.contractService.getContracts().subscribe({
      next: (response) => {
        const allContracts = response.data?.data || response.data || [];
        this.contracts = [...allContracts];

        if (this.selectedLotId) {
          this.applyLotFilter();
        }

        this.calculateKPIs();
        this.cdr.detectChanges();
      }
    });
  }

  calculatePreview(values: any) {
    const salePrice = Number(values.sale_price) || 0;
    const downPayment = Number(values.down_payment_pactada) || 0;
    const months = Number(values.term_months) || 0;
    const interestRate = Number(values.interest_rate) || 0;

    const principal = salePrice - downPayment;

    // Llamamos al servicio Core para hacer la matemática pesada
    this.projectedQuota = this.financialService.calculateFrenchQuota(principal, months, interestRate);
    this.projectedTotal = this.financialService.calculateProjectedTotal(this.projectedQuota, months, downPayment);
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (response) => {
        this.projects = response.data?.data || response.data || [];
        this.cdr.detectChanges();
      }
    });
  }

  loadCustomers() {
    this.customerService.getCustomers().subscribe({
      next: (response: any) => {
        const customers = response.data?.data || response.data || response || [];
        this.customers = Array.isArray(customers) ? customers : [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando clientes', err)
    });
  }

  saveQuickCustomer() {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    const rawCustomer = this.customerForm.getRawValue();
    const documentValue = String(rawCustomer.document ?? '').trim();

    const payload: Partial<Customer> = {
      name: String(rawCustomer.name ?? '').trim(),
      document_type: 'CC',
      document_number: documentValue,
      phone: rawCustomer.phone?.trim() || '3000000000',
      email: rawCustomer.email?.trim() || undefined,
    };

    this.customerService.createCustomer(payload).subscribe({
      next: (response: any) => {
        const customer = response.customer ?? response.data ?? response;

        this.customers = [...this.customers, customer];
        this.contractForm.patchValue({ customer_id: customer.id });
        this.customerForm.reset();
        this.showCustomerModal = false;
        this.successMessage = 'Cliente registrado y seleccionado correctamente.';
        this.errorMessage = '';
      },
      error: (err) => {
        console.error('Error al crear cliente', err);
        this.errorMessage = err.error?.message || 'No se pudo crear el cliente.';
      }
    });
  }

  getContractStatusLabel(status: string): string {
    const normalized = String(status || '').toLowerCase();

    switch (normalized) {
      case 'preventa_inactiva':
        return 'Preventa';
      case 'activo':
        return 'Activo';
      case 'terminado':
        return 'Terminado';
      case 'rescindido':
        return 'Rescindido';
      default:
        return status || 'Sin estado';
    }
  }

  onSubmit() {
    if (this.contractForm.invalid) {
      this.errorMessage = 'Por favor, complete todos los campos obligatorios.';
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const formValue = this.contractForm.getRawValue();
    const { project_id, down_payment_date, preventa_stages, ...rest } = formValue;

    const payload = {
      ...rest,
      initial_payment_date: down_payment_date,
      regular_payment_start_date: formValue.first_installment_date,
      first_installment_date: formValue.first_installment_date,
      preventa_installments_count: preventa_stages,
    };

    this.contractService.createContract(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Contrato registrado exitosamente.';

        this.contractForm.reset({ interest_rate: 1.00, project_id: '', preventa_stages: 7 });
        this.availableLots = [];
        this.isModalOpen = false;

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