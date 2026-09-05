import { Component, ElementRef, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup, FormControl, FormsModule } from '@angular/forms';
import { ContractService } from '../../../core/services/contract.service';
import { ProjectService } from '../../../core/services/project.service';
import { LotService } from '../../../core/services/lot.service';
import { CustomerService, Customer } from '../../../core/services/customer.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FinancialService } from '../../../core/services/financial.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppRoles } from '../../../core/models/app-roles';
import { CurrencyMaskDirective } from '../../../shared/directives/currency-mask.directive';
import { ContractStatusLabelPipe } from '../../../shared/pipes/contract-status-label.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { markAllAsTouched, scrollToFirstInvalid } from '../../../shared/utils/form-utils';
import { QuickCustomerModalComponent } from './quick-customer-modal/quick-customer-modal.component';
import { ContractPaymentPromisesComponent, createPaymentPromiseGroup } from './contract-payment-promises/contract-payment-promises.component';
import { unwrapListItems } from '../../../core/models/api-response';
import { LotStatusLabelPipe, lotStatusValue } from '../../../shared/pipes/lot-status-label.pipe';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, CurrencyMaskDirective, ContractStatusLabelPipe, LotStatusLabelPipe, FieldErrorComponent, QuickCustomerModalComponent, ContractPaymentPromisesComponent, PaginationComponent],
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
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private host = inject(ElementRef<HTMLElement>);

  get canCreate(): boolean {
    return this.authService.hasRole(AppRoles.ADMINISTRADOR);
  }

  contracts: any[] = [];
  customers: Customer[] = [];
  projects: any[] = [];
  availableLots: any[] = []; 
  selectedLotId: number | null = null;
  selectedLot: any = null;
  pageSize = 10;
  currentPage = 1;

  get pagedContracts(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.contracts.slice(start, start + this.pageSize);
  }
  
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
  totalCollected = 0;
  outstandingBalance = 0;
  paymentProgressPercent = 0;


  // Control del Modal
  isModalOpen = false;
  showCustomerModal = false;

  contractForm = this.fb.group({
    contract_number: ['', Validators.required],
    customer_id: ['', Validators.required],
    co_titular_ids: this.fb.array<FormControl<string | number | null>>([]),
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
    is_special_lot: [false],
    payment_promises: this.fb.array([]),
  });

  get paymentPromises(): FormArray<FormGroup> {
  return this.contractForm.get('payment_promises') as FormArray<FormGroup>;
}

  get extraTitularIds(): FormArray<FormControl<string | number | null>> {
    return this.contractForm.get('co_titular_ids') as FormArray<FormControl<string | number | null>>;
  }

  addTitular(): void {
    this.extraTitularIds.push(this.fb.control<string | number | null>(''));
  }

  removeTitular(index: number): void {
    this.extraTitularIds.removeAt(index);
  }

  private clearExtraTitulares(): void {
    while (this.extraTitularIds.length > 0) {
      this.extraTitularIds.removeAt(0);
    }
  }

  customersAvailableForHolder(slot: 'anchor' | number): Customer[] {
    const anchorId = Number(this.contractForm.get('customer_id')?.value || 0);
    const extraSelected = this.extraTitularIds.controls
      .map((control, i) => (slot === i ? null : Number(control.value || 0)))
      .filter((id): id is number => !!id);

    return this.customers.filter((customer) => {
      const id = Number(customer.id);
      if (slot !== 'anchor' && id === anchorId) {
        return false;
      }
      if (slot === 'anchor' && extraSelected.includes(id)) {
        return false;
      }
      return !extraSelected.includes(id);
    });
  }

  contractHoldersLabel(contract: { customer?: Customer; customers?: Customer[]; customer_id?: number }): string {
    const holders = contract.customers?.length
      ? contract.customers
      : (contract.customer ? [contract.customer] : []);
    const names = holders
      .map((holder) => holder.name)
      .filter((name): name is string => !!name)
      .sort((a, b) => a.localeCompare(b, 'es'));
    if (names.length === 0) {
      return contract.customer_id ? `Cliente #${contract.customer_id}` : 'Sin titulares';
    }
    return names.join(', ');
  }

  get totalCustomPromises(): number {
    return this.paymentPromises.controls.reduce((sum, control) => {
      const rawValue = (control as FormGroup).get('expected_amount')?.value;
      let cleanValue: number = 0;

      if (rawValue === null || rawValue === undefined || rawValue === '') {
        cleanValue = 0;
      } else if (typeof rawValue === 'string') {
        const sanitized = rawValue.replace(/[\$\.\,\s]/g, '');
        cleanValue = Number(sanitized) || 0;
      } else if (typeof rawValue === 'number') {
        cleanValue = Number.isFinite(rawValue) ? rawValue : 0;
      }

      return sum + cleanValue;
    }, 0);
  }

  get isCustomPlan(): boolean {
    return this.contractForm.get('is_custom_plan')?.value === true;
  }

  get isSpecialLot(): boolean {
    return this.contractForm.get('is_special_lot')?.value === true;
  }

  get isStandardPlan(): boolean {
    return !this.isCustomPlan && !this.isSpecialLot;
  }

  selectPlanMode(mode: 'standard' | 'custom' | 'special'): void {
    if (mode === 'special') {
      this.contractForm.patchValue({
        is_custom_plan: false,
        is_special_lot: true,
        start_date: this.contractForm.get('start_date')?.value || this.formatDateYYYYMMDD(new Date()),
      });
      this.clearPaymentPromises();
      this.showBatchAssistant = false;
    } else if (mode === 'custom') {
      this.contractForm.patchValue({ is_custom_plan: true, is_special_lot: false });
    } else {
      this.contractForm.patchValue({ is_custom_plan: false, is_special_lot: false });
    }
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
    const n = Number(this.contractForm.get('term_months')?.value ?? 0) || 0;
    return this.financialService.calculateFrenchQuota(
      this.capitalAFinanciar,
      n,
      this.tasaInteres,
    );
  }

  get interesesCalculados(): number {
    return Math.max(0, this.valorFuturoDeuda - this.capitalAFinanciar);
  }

  get valorFuturoDeuda(): number {
    const n = Number(this.contractForm.get('term_months')?.value ?? 0) || 0;
    if (n <= 0) {
      return Math.round(this.capitalAFinanciar);
    }

    // Redondear para eliminar centavos en el cálculo de intereses
    return Math.round(this.cuotaFijaEstimada * n);
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

  get missingTermInstallments(): number {
    const plazo = this.maxCuotasPermitidas;
    if (!this.isCustomPlan || plazo <= 0) {
      return 0;
    }

    return Math.max(0, plazo - this.paymentPromises.length);
  }

  get missingTermInstallmentsMessage(): string {
    const faltan = this.missingTermInstallments;
    if (faltan <= 0) {
      return '';
    }

    const plazo = this.maxCuotasPermitidas;
    const cuotaWord = faltan === 1 ? 'cuota' : 'cuotas';
    const verbo = faltan === 1 ? 'Falta' : 'Faltan';
    const mesWord = plazo === 1 ? 'mes' : 'meses';

    return `${verbo} ${faltan} ${cuotaWord} para completar el plazo de ${plazo} ${mesWord}`;
  }

  get costoTotalInmueble(): number {
    return this.valorFuturoDeuda + (Number(this.contractForm.get('down_payment_pactada')?.value ?? 0) || 0);
  }

  get diferenciaFinanciera(): number {
    // Asegurar que ambos valores estén redondeados antes de calcular la diferencia
    const valorFuturo = Math.round(this.valorFuturoDeuda);
    const totalDistribuido = Math.round(this.totalCustomPromises);
    const diferencia = valorFuturo - totalDistribuido;
    
    // Redondear la diferencia final para eliminar cualquier resto de centavos
    return Math.round(diferencia);
  }

  get hasFinancialDifference(): boolean {
    return Math.abs(this.diferenciaFinanciera) > 1000;
  }

  private updatePlanModeValidators(isCustom: boolean, isSpecial = false): void {
    const termMonthsControl = this.contractForm.get('term_months');
    const firstInstallmentDateControl = this.contractForm.get('first_installment_date');
    const preventaStagesControl = this.contractForm.get('preventa_stages');
    const downPaymentControl = this.contractForm.get('down_payment_pactada');
    const interestRateControl = this.contractForm.get('interest_rate');
    const downPaymentDateControl = this.contractForm.get('down_payment_date');

    if (!termMonthsControl || !firstInstallmentDateControl || !preventaStagesControl || !downPaymentControl || !interestRateControl || !downPaymentDateControl) {
      return;
    }

    if (isSpecial) {
      termMonthsControl.clearValidators();
      firstInstallmentDateControl.clearValidators();
      preventaStagesControl.clearValidators();
      downPaymentControl.clearValidators();
      interestRateControl.clearValidators();
      downPaymentDateControl.clearValidators();
    } else if (isCustom) {
      termMonthsControl.setValidators([Validators.required, Validators.min(1)]);
      firstInstallmentDateControl.clearValidators();
      preventaStagesControl.clearValidators();
      downPaymentControl.setValidators([Validators.required, Validators.min(0)]);
      interestRateControl.setValidators([Validators.required, Validators.min(0)]);
      downPaymentDateControl.setValidators([Validators.required]);
    } else {
      termMonthsControl.setValidators([Validators.required, Validators.min(1)]);
      firstInstallmentDateControl.setValidators([Validators.required]);
      preventaStagesControl.setValidators([Validators.required, Validators.min(0)]);
      downPaymentControl.setValidators([Validators.required, Validators.min(0)]);
      interestRateControl.setValidators([Validators.required, Validators.min(0)]);
      downPaymentDateControl.setValidators([Validators.required]);
    }

    termMonthsControl.updateValueAndValidity({ emitEvent: false });
    firstInstallmentDateControl.updateValueAndValidity({ emitEvent: false });
    preventaStagesControl.updateValueAndValidity({ emitEvent: false });
    downPaymentControl.updateValueAndValidity({ emitEvent: false });
    interestRateControl.updateValueAndValidity({ emitEvent: false });
    downPaymentDateControl.updateValueAndValidity({ emitEvent: false });
  }

  addPaymentPromise(): void {
    this.paymentPromises.push(createPaymentPromiseGroup(this.fb));
    this.showGeneratedPromises = true;
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

  get lotStatusKey(): string {
    return lotStatusValue(this.selectedLot?.status);
  }

  calculateKPIs() {
    this.totalContracts = this.contracts.length;
    this.totalPortfolioValue = this.contracts.reduce((sum, contract) => {
      return sum + Number(contract.sale_price || 0);
    }, 0);

    const kpiContract = this.pickKpiContract(this.contracts);
    const collected = this.sumContractPayments(kpiContract);
    const salePrice = Number(kpiContract?.sale_price || 0);
    this.totalCollected = collected;
    this.outstandingBalance = Math.max(0, salePrice - collected);
    this.paymentProgressPercent = salePrice > 0
      ? Math.min(100, (collected / salePrice) * 100)
      : 0;
  }

  private pickKpiContract(contracts: any[]): any | null {
    if (!contracts.length) {
      return null;
    }

    const statusOf = (contract: any): string =>
      String(contract?.status?.value ?? contract?.status ?? '').toLowerCase();

    const byRecency = (left: any, right: any): number => {
      const leftDate = Date.parse(String(left?.start_date || left?.created_at || 0));
      const rightDate = Date.parse(String(right?.start_date || right?.created_at || 0));
      if (rightDate !== leftDate) {
        return rightDate - leftDate;
      }
      return Number(right?.id || 0) - Number(left?.id || 0);
    };

    const active = contracts.filter((contract) => statusOf(contract) === 'activo').sort(byRecency);
    if (active.length > 0) {
      return active[0];
    }

    return [...contracts].sort(byRecency)[0];
  }

  private sumContractPayments(contract: any | null): number {
    if (!contract) {
      return 0;
    }

    const transactions = Array.isArray(contract.transactions) ? contract.transactions : [];
    return transactions.reduce((sum: number, transaction: { amount?: number | string }) => {
      return sum + Number(transaction.amount || 0);
    }, 0);
  }

  openModal() {
    this.isModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.contractForm.get('start_date')?.value) {
      this.contractForm.patchValue({ start_date: this.formatDateYYYYMMDD(new Date()) }, { emitEvent: false });
    }
    this.cdr.detectChanges();
  }

  closeModal() {
    this.isProgrammaticPlanReset = true;
    this.isModalOpen = false;
    this.contractForm.reset();
    this.clearPaymentPromises();
    this.clearExtraTitulares();
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
      this.loadSelectedLot();
      this.loadContracts();
    });

    this.lastIsCustomPlanValue = this.isCustomPlan;

    this.contractForm.get('is_custom_plan')?.valueChanges.subscribe((isCustom: boolean | null) => {
      const isCustomMode = isCustom === true;

      this.updatePlanModeValidators(isCustomMode, this.isSpecialLot);

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

    this.updatePlanModeValidators(this.isCustomPlan, this.isSpecialLot);

    this.contractForm.get('is_special_lot')?.valueChanges.subscribe(() => {
      this.updatePlanModeValidators(this.isCustomPlan, this.isSpecialLot);
    });

    if (this.canCreate) {
      this.loadCustomers();
    }
    this.loadProjects();

    // VIGILANTE REACTIVO: Escucha cada vez que cambia el select de proyecto
    this.contractForm.get('project_id')?.valueChanges.subscribe(projectId => {
      // 1. Reseteamos el lote elegido y la lista
      this.contractForm.patchValue({ lot_id: '' }, { emitEvent: false });
      this.availableLots = [];

      if (!projectId) return;

      // 2. Pedimos los lotes a Laravel
      // 2. Pedimos los lotes a Laravel
      this.lotService.getLotsByProject(Number(projectId), 1, 100).subscribe({
        next: (response) => {
          // Extraemos el arreglo inteligente
          let allLots: any[] = [];
          const data = Array.isArray(response)
            ? response
            : response?.data;

          if (Array.isArray(data)) {
            allLots = data;
          } else if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: unknown }).data)) {
            allLots = (data as { data: any[] }).data;
          }

          this.availableLots = allLots.filter((lot: any) => {
            const statusStr = typeof lot.status === 'object' ? (lot.status?.value || lot.status?.name) : lot.status;
            const statusLimpio = String(statusStr).toLowerCase().trim();

            return statusLimpio === 'available' || statusLimpio === 'disponible';
          });

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error cargando lotes:', err);
          this.availableLots = [];
          this.cdr.detectChanges();
        }
      });
    });
    this.contractForm.valueChanges.subscribe(values => {
      this.calculatePreview(values);
    });
  }

  private applyLotFilter(): void {
    if (!this.selectedLotId) {
      if (!this.selectedLot) {
        this.selectedLot = null;
      }
      return;
    }

    const filtered = this.contracts.filter((contract: any) => {
      const contractLotId = Number(contract.lot_id ?? contract.lot?.id ?? 0);
      return contractLotId === this.selectedLotId;
    });

    this.contracts = filtered;
    const lotFromContract = filtered[0]?.lot;
    if (lotFromContract) {
      this.selectedLot = { ...this.selectedLot, ...lotFromContract };
    } else if (!this.selectedLot) {
      this.selectedLot = { id: this.selectedLotId };
    }
  }

  private loadSelectedLot(): void {
    if (!this.selectedLotId) {
      this.selectedLot = null;
      return;
    }

    this.lotService.getLot(this.selectedLotId).subscribe({
      next: (response) => {
        this.selectedLot = response?.data ?? response ?? { id: this.selectedLotId };
        this.cdr.detectChanges();
      },
      error: () => {
        this.selectedLot = this.selectedLot ?? { id: this.selectedLotId };
        this.cdr.detectChanges();
      },
    });
  }

  loadContracts() {
    this.currentPage = 1;
    const params = this.selectedLotId
      ? { lotId: this.selectedLotId, perPage: 100 }
      : undefined;

    this.contractService.getContracts(params).subscribe({
      next: (response) => {
        this.contracts = unwrapListItems(response);

        if (this.selectedLotId) {
          this.applyLotFilter();
        }

        this.calculateKPIs();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando contratos', err);
        this.contracts = [];
        this.errorMessage = 'No se pudieron cargar los contratos. Intente nuevamente.';
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
        const responseData = Array.isArray(response)
          ? response
          : response && typeof response === 'object' && 'data' in response
            ? response.data
            : undefined;

        const allProjects = Array.isArray(responseData)
          ? responseData
          : Array.isArray((responseData as { data?: unknown })?.data)
            ? (responseData as { data: any[] }).data
            : [];
        this.projects = allProjects;
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

  loadCustomers() {
    this.customerService.getCustomers().subscribe({
      next: (response: any) => {
        const payload = Array.isArray(response)
          ? response
          : response && typeof response === 'object' && 'data' in response
            ? response.data
            : response ?? [];

        const customers = Array.isArray(payload) ? payload : [];
        this.customers = customers;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando clientes', err);
        this.customers = [];
        this.cdr.detectChanges();
      }
    });
  }

  onQuickCustomerCreated(customer: Customer): void {
    this.contractForm.patchValue({ customer_id: customer.id as any });
    this.loadCustomers();
    this.showCustomerModal = false;
    this.successMessage = 'Cliente registrado y seleccionado correctamente.';
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  onQuickCustomerFailed(message: string): void {
    this.errorMessage = message;
    this.cdr.detectChanges();
  }

  private findInvalidControls(): string[] {
    const invalid: string[] = [];

    const contractControls = this.contractForm.controls as Record<string, any>;
    Object.keys(contractControls).forEach((controlName) => {
      const control = contractControls[controlName];

      if (control?.invalid) {
        invalid.push(`contractForm.${controlName}`);
      }
    });

    this.paymentPromises.controls.forEach((control, index) => {
      const group = control as FormGroup;
      const groupControls = group.controls as Record<string, any>;

      Object.keys(groupControls).forEach((controlName) => {
        if (groupControls[controlName]?.invalid) {
          invalid.push(`payment_promises[${index}].${controlName}`);
        }
      });
    });

    return invalid;
  }

  onSubmit() {
    const isCustom = Boolean(this.contractForm.get('is_custom_plan')?.value) && !this.isSpecialLot;
    const isSpecial = this.isSpecialLot;
    const normalizedPromises = isCustom
      ? this.paymentPromises.value.map((promise: any, index: number) => ({
          payment_number: index + 1,
          expected_date: promise.expected_date,
          expected_amount: Number(promise.expected_amount),
          description: promise.description,
        }))
      : [];

    if (isCustom && this.hasExceededTermLimit) {
      // Solo advertimos para diagnóstico: ya no se bloquea el envío por cantidad de cuotas.
      console.warn('[Contracts] Advertencia: cuotas personalizadas superan term_months, pero se permite continuar', {
        paymentPromisesLength: this.paymentPromises.length,
        termMonths: this.maxCuotasPermitidas,
      });
    }

    if (this.contractForm.invalid) {
      if (isCustom) {
        this.showGeneratedPromises = true;
      }
      markAllAsTouched(this.contractForm);
      this.cdr.detectChanges();
      scrollToFirstInvalid(this.host.nativeElement);
      this.toast.show('Formulario incompleto', 'error', 'Revisa los campos marcados en rojo');
      return;
    }

    if (isCustom && this.hasFinancialDifference) {
      console.warn('[Contracts] Bloqueado: diferencia financiera fuera de tolerancia', {
        diferenciaFinanciera: this.diferenciaFinanciera,
        tolerancia: 1000,
      });
      this.errorMessage = 'La suma de cuotas personalizadas debe cuadrar con el valor futuro de la deuda (PMT × plazo), con un margen de +/- $1,000.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const formValue = this.contractForm.getRawValue();
    const { project_id, down_payment_date, preventa_stages, payment_promises: _paymentPromises, co_titular_ids, ...rest } = formValue;
    const anchorCustomerId = Number(formValue.customer_id);
    const extraTitularIds = (co_titular_ids || [])
      .map((id) => Number(id))
      .filter((id) => id > 0 && id !== anchorCustomerId);

    const effectiveFirstInstallmentDate = isCustom || isSpecial
      ? (down_payment_date || formValue.start_date)
      : formValue.first_installment_date;

    const salePrice = Number(formValue.sale_price || 0);
    const effectiveTermMonths = isSpecial ? 0 : Number(formValue.term_months || 0);
    const effectivePreventaStages = isCustom || isSpecial ? 0 : Number(preventa_stages ?? 0);
    const startDate = formValue.start_date;

    const payload = {
      ...rest,
      customer_id: anchorCustomerId,
      co_titular_ids: extraTitularIds,
      sale_price: salePrice,
      down_payment_pactada: isSpecial ? salePrice : formValue.down_payment_pactada,
      term_months: effectiveTermMonths,
      interest_rate: isSpecial ? 0 : formValue.interest_rate,
      initial_payment_date: isSpecial ? startDate : down_payment_date,
      regular_payment_start_date: isSpecial ? startDate : effectiveFirstInstallmentDate,
      first_installment_date: isSpecial ? startDate : effectiveFirstInstallmentDate,
      preventa_installments_count: effectivePreventaStages,
      is_custom_plan: isCustom,
      is_special_lot: isSpecial,
      promises: normalizedPromises,
    };

    this.contractService.createContract(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Contrato registrado exitosamente.';

        this.isProgrammaticPlanReset = true;
        this.contractForm.reset({ interest_rate: 1.00, project_id: '', preventa_stages: 7 });
        this.clearPaymentPromises();
        this.clearExtraTitulares();
        this.lastIsCustomPlanValue = false;
        this.isProgrammaticPlanReset = false;
        this.availableLots = [];
        this.isModalOpen = false;

        this.loadContracts();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[Contracts] Error al crear contrato', err);
        this.isLoading = false;

        if (err.status === 422 && err.error?.errors) {
          const backendErrors = err.error.errors as Record<string, string[]>;
          const flattenMessages = Object.values(backendErrors)
            .flat()
            .filter((msg) => typeof msg === 'string');

          this.errorMessage = flattenMessages.length > 0
            ? flattenMessages.join('. ')
            : 'Validación rechazada por el backend.';
        } else {
          this.errorMessage = err.error?.message || 'Hubo un error al registrar el contrato.';
        }

        this.cdr.detectChanges();
      }
    });
  }
}