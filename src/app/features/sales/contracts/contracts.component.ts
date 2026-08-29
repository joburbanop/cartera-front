import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup, FormsModule } from '@angular/forms';
import { ContractService } from '../../../core/services/contract.service';
import { ProjectService } from '../../../core/services/project.service';
import { LotService } from '../../../core/services/lot.service';
import { CustomerService, Customer } from '../../../core/services/customer.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FinancialService } from '../../../core/services/financial.service';
import { CurrencyMaskDirective } from '../../../shared/directives/currency-mask.directive';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, CurrencyMaskDirective],
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

  batchCount: number = 1;
  batchAmount: number = 0;
  batchStartDate: string = '';
  batchDescription: string = 'Cuota ordinaria';
  showBatchAssistant = false;
  batchErrorMessage = '';
  private lastIsCustomPlanValue = false;
  private isProgrammaticPlanReset = false;

  // Controla si la lista de cuotas generadas se muestra expandida o colapsada
  showGeneratedPromises = true;


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
    preventa_stages: [7, [Validators.required, Validators.min(0)]],
    is_custom_plan: [false],
    payment_promises: this.fb.array([]),
  });

  get paymentPromises(): FormArray<FormGroup> {
  return this.contractForm.get('payment_promises') as FormArray<FormGroup>;
}

  get totalCustomPromises(): number {
    return this.paymentPromises.controls.reduce((sum, control) => {
      const amount = Number((control as FormGroup).get('expected_amount')?.value ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  }

  get isCustomPlan(): boolean {
    return this.contractForm.get('is_custom_plan')?.value === true;
  }

  get tasaInteres(): number {
    return Number(this.contractForm.get('interest_rate')?.value ?? 0) || 0;
  }

  get capitalAFinanciar(): number {
    const precio = Number(this.contractForm.get('sale_price')?.value ?? 0) || 0;
    const inicial = Number(this.contractForm.get('down_payment_pactada')?.value ?? 0) || 0;
    return Math.max(0, precio - inicial);
  }

  get saldoAFinanciar(): number {
    return this.capitalAFinanciar;
  }

  get plazoFinanciero(): number {
    const plazoFormulario = Number(this.contractForm.get('term_months')?.value ?? 0) || 0;
    return this.paymentPromises.length > 0 ? this.paymentPromises.length : plazoFormulario || 1;
  }

  get cuotaFijaEstimada(): number {
    const P = this.capitalAFinanciar;
    const i = (this.tasaInteres || 0) / 100;
    const n = Number(this.contractForm.get('term_months')?.value ?? 0) || 0;

    if (P <= 0 || n <= 0) {
      return 0;
    }

    if (i === 0) {
      return P / n;
    }

    return P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  }

  get interesesCalculados(): number {
    return Math.max(0, this.valorFuturoDeuda - this.capitalAFinanciar);
  }

  get valorFuturoDeuda(): number {
    const n = Number(this.contractForm.get('term_months')?.value ?? 0) || 0;
    if (n <= 0) {
      return this.capitalAFinanciar;
    }

    return this.cuotaFijaEstimada * n;
  }

  get maxCuotasPermitidas(): number {
    return Number(this.contractForm.get('term_months')?.value ?? 0) || 0;
  }

  get hasExceededTermLimit(): boolean {
    const maxAllowed = this.maxCuotasPermitidas;
    if (maxAllowed <= 0) {
      return false;
    }

    return this.paymentPromises.length > maxAllowed;
  }

  get costoTotalInmueble(): number {
    return this.valorFuturoDeuda + (Number(this.contractForm.get('down_payment_pactada')?.value ?? 0) || 0);
  }

  get diferenciaFinanciera(): number {
    return this.valorFuturoDeuda - this.totalCustomPromises;
  }

  get hasFinancialDifference(): boolean {
    return Math.abs(this.diferenciaFinanciera) > 5;
  }

  private updatePlanModeValidators(isCustom: boolean): void {
    const termMonthsControl = this.contractForm.get('term_months');
    const firstInstallmentDateControl = this.contractForm.get('first_installment_date');
    const preventaStagesControl = this.contractForm.get('preventa_stages');

    if (!termMonthsControl || !firstInstallmentDateControl || !preventaStagesControl) {
      return;
    }

    if (isCustom) {
      termMonthsControl.setValidators([Validators.required, Validators.min(1)]);
      firstInstallmentDateControl.clearValidators();
      preventaStagesControl.clearValidators();
    } else {
      termMonthsControl.setValidators([Validators.required, Validators.min(1)]);
      firstInstallmentDateControl.setValidators([Validators.required]);
      preventaStagesControl.setValidators([Validators.required, Validators.min(0)]);
    }

    termMonthsControl.updateValueAndValidity({ emitEvent: false });
    firstInstallmentDateControl.updateValueAndValidity({ emitEvent: false });
    preventaStagesControl.updateValueAndValidity({ emitEvent: false });
  }

  addPaymentPromise(): void {
    const promiseGroup = this.fb.group({
      expected_date: ['', Validators.required],
      expected_amount: [null, [Validators.required, Validators.min(1)]],
      description: ['', Validators.required],
    });

    this.paymentPromises.push(promiseGroup);
    this.showGeneratedPromises = true;
  }

  removePaymentPromise(index: number): void {
    this.paymentPromises.removeAt(index);
  }

  private clearPaymentPromises(): void {
    this.paymentPromises.clear();
    this.batchErrorMessage = '';
    this.showGeneratedPromises = true;
  }

  private formatDateYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private addMonthsSafely(baseDate: Date, monthsToAdd: number): Date {
    const baseYear = baseDate.getFullYear();
    const baseMonth = baseDate.getMonth();
    const baseDay = baseDate.getDate();

    const targetMonthIndex = baseMonth + monthsToAdd;
    const targetYear = baseYear + Math.floor(targetMonthIndex / 12);
    const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
    const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const targetDay = Math.min(baseDay, lastDayOfTargetMonth);

    return new Date(targetYear, targetMonth, targetDay);
  }

  generateBatch(): void {
    this.batchErrorMessage = '';

    const count = Number(this.batchCount);
    const amount = Number(this.batchAmount);
    const startDate = String(this.batchStartDate || '').trim();
    const description = String(this.batchDescription || '').trim() || 'Cuota ordinaria';

    if (!Number.isFinite(count) || count <= 0 || !Number.isInteger(count)) {
      this.batchErrorMessage = 'La cantidad de cuotas debe ser un numero entero mayor a cero.';
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      this.batchErrorMessage = 'El valor por cuota debe ser mayor a cero.';
      return;
    }

    if (!startDate) {
      this.batchErrorMessage = 'Debes seleccionar la fecha inicial del lote.';
      return;
    }

    const baseDate = new Date(`${startDate}T00:00:00`);

    if (Number.isNaN(baseDate.getTime())) {
      this.batchErrorMessage = 'La fecha inicial no es valida.';
      return;
    }

    const maxCuotasPermitidas = this.maxCuotasPermitidas;
    const cuotasActuales = this.paymentPromises.length;

    if (maxCuotasPermitidas > 0 && cuotasActuales + count > maxCuotasPermitidas) {
      this.batchErrorMessage = `El plazo actual permite máximo ${maxCuotasPermitidas} cuotas. Ya tienes ${cuotasActuales} y estás intentando agregar ${count}.`;
      return;
    }

    const totalBatchAmount = Math.round(count * amount * 100) / 100;
    const projectedTotal = Math.round((this.totalCustomPromises + totalBatchAmount) * 100) / 100;
    const limitePermitido = this.valorFuturoDeuda ? this.valorFuturoDeuda : this.saldoAFinanciar;

    if (projectedTotal > limitePermitido + 1) {
      this.batchErrorMessage = 'El lote excede el Valor Futuro pendiente por financiar. Ajusta la cantidad o el valor por cuota.';
      return;
    }

    for (let i = 0; i < count; i++) {
      const calculatedDate = this.addMonthsSafely(baseDate, i);
      const promiseGroup = this.fb.group({
        expected_date: [this.formatDateYYYYMMDD(calculatedDate), Validators.required],
        expected_amount: [amount, [Validators.required, Validators.min(1)]],
        description: [description, Validators.required],
      });

      this.paymentPromises.push(promiseGroup);
    }

    this.batchCount = 1;
    this.batchAmount = 0;
    this.batchStartDate = '';
    this.batchDescription = 'Cuota ordinaria';
    this.showGeneratedPromises = true;
  }

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
    this.isProgrammaticPlanReset = true;
    this.isModalOpen = false;
    this.contractForm.reset();
    this.clearPaymentPromises();
    this.batchCount = 1;
    this.batchAmount = 0;
    this.batchStartDate = '';
    this.batchDescription = 'Cuota ordinaria';
    this.showBatchAssistant = false;
    this.showGeneratedPromises = true;
    this.lastIsCustomPlanValue = false;
    this.isProgrammaticPlanReset = false;
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const lotId = params.get('lotId');
      this.selectedLotId = lotId ? Number(lotId) : null;
      this.loadContracts();
    });

    this.lastIsCustomPlanValue = this.isCustomPlan;

    this.contractForm.get('is_custom_plan')?.valueChanges.subscribe((isCustom: boolean | null) => {
      const isCustomMode = isCustom === true;

      this.updatePlanModeValidators(isCustomMode);

      if (isCustomMode && this.paymentPromises.length === 0) {
        this.addPaymentPromise();
      }

      if (
        !isCustomMode
        && this.lastIsCustomPlanValue
        && !this.isProgrammaticPlanReset
      ) {
        this.clearPaymentPromises();
        this.showBatchAssistant = false;
      }

      this.lastIsCustomPlanValue = isCustomMode;
    });

    this.updatePlanModeValidators(this.isCustomPlan);

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
        // La respuesta viene en formato { success, message, data: [...] }
        const customers = response.data || response || [];
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

    const payload = {
      name: String(rawCustomer.name ?? '').trim(),
      document_type: 'CC',
      document_number: documentValue,
      phone: rawCustomer.phone?.trim() || '3000000000',
      email: rawCustomer.email?.trim() || null,
    };

    this.customerService.createCustomer(payload).subscribe({
      next: (response: any) => {
        // La respuesta viene en formato { success, message, data: {...} }
        const customer = response.data || response;

        // Seleccionar automáticamente el cliente recién creado
        this.contractForm.patchValue({ customer_id: customer.id });
        
        // Recargar la lista completa de clientes para mantener consistencia
        this.loadCustomers();
        
        // Cerrar modal y mostrar mensaje
        this.customerForm.reset();
        this.showCustomerModal = false;
        this.successMessage = 'Cliente registrado y seleccionado correctamente.';
        this.errorMessage = '';
      },
      error: (err) => {
        console.error('Error al crear cliente', err);
        
        // Manejo de errores de validación 422
        if (err.status === 422 && err.error?.errors) {
          const errors = err.error.errors;
          const errorMessages: string[] = [];
          
          for (const field in errors) {
            const messages = errors[field];
            if (Array.isArray(messages)) {
              errorMessages.push(...messages);
            }
          }
          
          this.errorMessage = errorMessages.join('. ');
        } else {
          this.errorMessage = err.error?.message || 'No se pudo crear el cliente.';
        }
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
    const isCustom = Boolean(this.contractForm.get('is_custom_plan')?.value);
    const normalizedPromises = isCustom
      ? this.paymentPromises.value.map((promise: any, index: number) => ({
          payment_number: index + 1,
          expected_date: promise.expected_date,
          expected_amount: Number(promise.expected_amount),
          description: promise.description,
        }))
      : [];

    if (isCustom && this.paymentPromises.invalid) {
      this.paymentPromises.markAllAsTouched();
      this.errorMessage = 'Complete cada promesa de pago con fecha, monto y descripción.';
      return;
    }

    if (isCustom && this.hasExceededTermLimit) {
      this.errorMessage = `La cantidad de cuotas personalizadas supera el plazo definido (${this.maxCuotasPermitidas} meses). Ajusta el cronograma o reduce el plazo.`;
      return;
    }

    if (isCustom && this.hasFinancialDifference) {
      this.errorMessage = 'La suma de cuotas personalizadas debe cuadrar con el valor futuro de la deuda (PMT × plazo), con un margen de +/- $5.';
      return;
    }

    if (this.contractForm.invalid) {
      this.errorMessage = 'Por favor, complete todos los campos obligatorios.';
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const formValue = this.contractForm.getRawValue();
    const { project_id, down_payment_date, preventa_stages, payment_promises: _paymentPromises, ...rest } = formValue;

    const effectiveFirstInstallmentDate = isCustom
      ? (down_payment_date || formValue.start_date)
      : formValue.first_installment_date;

    const effectiveTermMonths = Number(formValue.term_months || 0);

    const effectivePreventaStages = isCustom
      ? 0
      : Number(preventa_stages ?? 0);

    const payload = {
      ...rest,
      term_months: effectiveTermMonths,
      initial_payment_date: down_payment_date,
      regular_payment_start_date: effectiveFirstInstallmentDate,
      first_installment_date: effectiveFirstInstallmentDate,
      preventa_installments_count: effectivePreventaStages,
      is_custom_plan: isCustom,
      promises: normalizedPromises,
    };

    this.contractService.createContract(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Contrato registrado exitosamente.';

        this.isProgrammaticPlanReset = true;
        this.contractForm.reset({ interest_rate: 1.00, project_id: '', preventa_stages: 7 });
        this.clearPaymentPromises();
        this.lastIsCustomPlanValue = false;
        this.isProgrammaticPlanReset = false;
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