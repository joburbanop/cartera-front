import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AmortizationService } from '../../../core/services/amortization.service';
import { ContractService } from '../../../core/services/contract.service';
import { FinancialService } from '../../../core/services/financial.service';
import { DrawerPagoComponent } from '../../../shared/components/drawer-pago/drawer-pago.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivityEntry } from '../../../core/models/activity-entry.model';
import { RecaudoService } from '../../../core/services/recaudo.service';
import { ActivityService } from '../../../core/services/activity.service';
import { AmortizationFinancialsService } from '../../../core/services/amortization-financials.service';
import { AmortizationSelectionService } from './amortization-selection.service';
import { ContractStatusLabelPipe } from '../../../shared/pipes/contract-status-label.pipe';
import { PaymentMethodNamePipe } from '../../../shared/pipes/payment-method-name.pipe';
import { AmortizationTablePresenterComponent } from '../../../shared/components/amortization-table-presenter/amortization-table-presenter.component';
import { ContractSummaryCardComponent } from './contract-summary-card/contract-summary-card.component';
import { PaymentPromiseTabComponent } from './payment-promise-tab/payment-promise-tab.component';
import { EditDueDateModalComponent } from './edit-due-date-modal/edit-due-date-modal.component';
import { PaymentPromiseService } from '../../../core/services/payment-promise.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { ToastService } from '../../../shared/services/toast.service';
import { BitacoraComponent } from '../../../shared/components/bitacora/bitacora.component';
import { PaymentPromise } from '../../../core/models/payment-promise.model';
import { AmortizationInstallment } from '../../../core/models/amortization-installment.model';
import { AppRoles } from '../../../core/models/app-roles';
import { isPaidStatus, isVencida } from '../../../core/models/amortization-status';
@Component({
  selector: 'app-tabla-amortizacion',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    DrawerPagoComponent,
    PaymentMethodNamePipe,
    AmortizationTablePresenterComponent,
    ContractSummaryCardComponent,
    PaymentPromiseTabComponent,
    EditDueDateModalComponent,
    BitacoraComponent,
  ],
  templateUrl: './tabla-amortizacion.component.html',
  styleUrl: './tabla-amortizacion.component.scss',
  providers: [AmortizationSelectionService],
})
export class AmortizationComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private amortizationService = inject(AmortizationService);
  private contractService = inject(ContractService);
  private financialService = inject(FinancialService);
  private cdr = inject(ChangeDetectorRef);
  private recaudoService = inject(RecaudoService);
  private activityService = inject(ActivityService);
  private financials = inject(AmortizationFinancialsService);
  private selection = inject(AmortizationSelectionService);
  private paymentPromiseService = inject(PaymentPromiseService);
  private authService = inject(AuthService);
  private pageTitle = inject(PageTitleService);
  private toast = inject(ToastService);

  get canRegisterPayments(): boolean {
    return this.authService.hasRole(AppRoles.ADMINISTRADOR);
  }

  contractId!: number;
  activeTab: 'amortizacion' | 'promesa' = 'amortizacion';
  contractData: any = null;
  amortizationPlan: any[] = [];
  totalWithInterest = 0;
  isLoading = true;
  isGenerating = false;
  isDrawerOpen = false;
  isProcessingPayment = false;
  currentView: 'venta' | 'preventa' = 'venta';
  resetSelectionFlag = false;
  isGeneralPaymentFlow = false;
  drawerSuggestedAmount: number | null = null;
  transactions: any[] = [];
  isHistoryModalOpen = false;
  isLoadingHistory = false;
  paymentPromises: PaymentPromise[] = [];
  activityEntries: ActivityEntry[] = [];
  isLoadingActivity = false;
  isEditDueDateModalOpen = false;
  isUpdatingDueDate = false;
  editingInstallment: AmortizationInstallment | null = null;

  get canViewBitacora(): boolean {
    return this.authService.hasRole(AppRoles.SOCIO_GERENCIA);
  }

  get selectedFees(): any[] {
    return this.selection.selectedFees;
  }

  set selectedFees(value: any[]) {
    this.selection.selectedFees = value ?? [];
  }

  private clearTableSelection(): void {
    this.selection.clearSelection();
    this.selectedFees = [];
    this.resetSelectionFlag = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.resetSelectionFlag = false;
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.contractId = Number(params['id']);
        this.loadContractData();
        this.loadAmortizationPlan();
      }
    });
  }

  loadContractData(): void {
    this.contractService.getContractById(this.contractId).subscribe({
      next: (response) => {
        this.contractData = response.data || response;
        this.pageTitle.set(this.buildContractTitle(this.contractData));
        this.setDefaultView();
        this.calculateFinancials();
        this.loadPaymentPromises();
        this.loadActivity();
        this.cdr.detectChanges();
      },
      error: () => this.router.navigate(['/contracts']),
    });
  }

  loadPaymentPromises(): void {
    this.paymentPromiseService.getPromisesByContract(this.contractId).subscribe({
      next: (response: any) => {
        const payload = response?.data ?? response ?? [];
        this.paymentPromises = Array.isArray(payload) ? payload : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.paymentPromises = [];
      }
    });
  }

  private loadActivity(): void {
    if (!this.canViewBitacora || !this.contractId) {
      this.activityEntries = [];
      return;
    }

    this.isLoadingActivity = true;
    this.activityService.getActivity('contract', this.contractId).subscribe({
      next: (response) => {
        this.activityEntries = (response.data ?? []) as ActivityEntry[];
        this.isLoadingActivity = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.activityEntries = [];
        this.isLoadingActivity = false;
        this.cdr.detectChanges();
      },
    });
  }

  cargarTablaAmortizacion(): void {
    this.amortizationService.getPlan(this.contractId).subscribe({
      next: (response) => {
        const payload = (response.data ?? response) as AmortizationInstallment[] | { rows?: AmortizationInstallment[] };
        const plan = Array.isArray(payload) ? payload : payload.rows ?? [];

        if (Array.isArray(plan) && plan.length === 0) {
          this.generatePlan();
          return;
        }

        this.amortizationPlan = plan;
        this.clearTableSelection();
        this.selection.setPlan(this.amortizationPlan);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  loadAmortizationPlan(): void {
    this.cargarTablaAmortizacion();
  }

  downloadPdf(type: 'internal' | 'client' = 'internal'): void {
    this.amortizationService.downloadPdf(this.contractId, type).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `extracto-amortizacion-${type}-v1.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => undefined,
    });
  }

  generatePlan(): void {
    this.isGenerating = true;
    this.amortizationService.generatePlan(this.contractId).subscribe({
      next: () => {
        this.isGenerating = false;
        this.loadAmortizationPlan();
      },
      error: () => {
        this.isGenerating = false;
      },
    });
  }

  calculateFinancials(): void {
    if (!this.contractData) {
      return;
    }

    const salePrice = Number(this.contractData.sale_price) || 0;
    const downPayment = Number(this.contractData.down_payment_pactada) || 0;
    const months = Number(this.contractData.term_months) || 0;
    const interestRate = Number(this.contractData.interest_rate) || 0;
    const principal = salePrice - downPayment;

    if (principal > 0 && months > 0) {
      const quota = this.financialService.calculateFrenchQuota(principal, months, interestRate);
      this.totalWithInterest = this.financialService.calculateProjectedTotal(quota, months, downPayment);
    } else {
      this.totalWithInterest = salePrice;
    }
  }

  setDefaultView(): void {
    this.currentView = this.contractData?.status === 'preventa_inactiva' ? 'preventa' : 'venta';
  }

  isFeeSelectable(fee: any): boolean {
    return this.financials.isFeeSelectable(fee, this.amortizationPlan, this.contractData);
  }

  toggleFeeSelection(fee: any, event: any): void {
    if (isPaidStatus(fee?.status ?? fee?.estado)) {
      if (event?.target) {
        event.target.checked = false;
      }
      return;
    }

    this.selection.toggleFeeSelection(fee, event, this.isFeeSelectable(fee));
  }

  onInstallmentSelectionChange(selected: any[]): void {
    this.selectedFees = selected;
  }

  onEditDueDate(installment: AmortizationInstallment): void {
    if (!this.canRegisterPayments) {
      return;
    }

    if (!installment || Number(installment.installment_number) <= 0 || isPaidStatus(installment.status)) {
      return;
    }

    this.editingInstallment = installment;
    this.isEditDueDateModalOpen = true;
    this.cdr.detectChanges();
  }

  closeEditDueDateModal(): void {
    if (this.isUpdatingDueDate) {
      return;
    }

    this.isEditDueDateModalOpen = false;
    this.editingInstallment = null;
    this.cdr.detectChanges();
  }

  saveInstallmentDueDate(dueDate: string): void {
    if (!this.editingInstallment?.id) {
      return;
    }

    this.isUpdatingDueDate = true;

    this.amortizationService
      .updateInstallmentDueDate(this.contractId, Number(this.editingInstallment.id), dueDate)
      .subscribe({
        next: () => {
          this.isUpdatingDueDate = false;
          this.isEditDueDateModalOpen = false;
          this.editingInstallment = null;

          this.toast.show(
            'Fecha actualizada',
            'success',
            'La fecha de vencimiento se actualizo correctamente.',
          );

          this.cargarTablaAmortizacion();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isUpdatingDueDate = false;
          this.toast.show(
            'No se pudo actualizar la fecha',
            'error',
            this.readFirstBackendError(err),
          );
          this.cdr.detectChanges();
        },
      });
  }

  toggleSelectAll(event: any): void {
    this.selection.toggleSelectAll(event, this.amortizationPlan, (item: any) => this.isFeeSelectable(item));
  }

  allInstallmentsPaid(): boolean {
    return this.amortizationPlan.length > 0 && this.amortizationPlan.every((fee: any) => {
      return isPaidStatus(this.getFeeStatus(fee));
    });
  }

  isSelected(fee: any): boolean {
    return this.selection.isSelected(fee);
  }

  getFeeDebtValue(fee: any): number {
    return this.selection.getFeeDebtValue(fee);
  }

  get totalSelectedAmount(): number {
    return this.selection.totalSelectedAmount;
  }

  get totalOverdueQuotaDebt(): number {
    return this.selection.totalOverdueQuotaDebt;
  }

  /**
   * Delegado a `isVencida` de core. Se conserva como método del componente
   * para que los specs existentes sigan llamándolo vía `(component as any).isVencida`.
   */
  private isVencida(dueDate: string | Date | null | undefined): boolean {
    return isVencida(dueDate);
  }

  openDrawer(): void {
    this.isGeneralPaymentFlow = false;
    this.drawerSuggestedAmount = null;

    // Filtrar las seleccionadas manualmente que aún sean elegibles
    const seleccionadasValidas = this.selectedFees.filter(
      (fee: any) => this.isFeeSelectable(fee)
    );

    // --- Regla de negocio: separar tipo antes de fusionar mora ---
    // La cuota inicial (installment_number === 0) va al endpoint /down-payment,
    // las cuotas regulares van a /cascade. Nunca mezclar ambos tipos en un pago.
    const isSeleccionInicial = seleccionadasValidas.some(
      (c: any) => Number(c.installment_number) === 0
    );

    // Filtrar mora del mismo tipo que la selección manual
    const cuotasEnMora = (this.amortizationPlan ?? []).filter((c: any) => {
      const esPagada = isPaidStatus(c?.status);
      const esVencida = this.isVencida(c.due_date);
      const esInicial = Number(c.installment_number) === 0;

      if (esPagada || !esVencida) return false;

      // Solo incluir mora del mismo "carril" que la selección del usuario
      return isSeleccionInicial ? esInicial : !esInicial;
    });

    // Fusionar mora tipada + selección manual y eliminar duplicados por id
    const merged = [...cuotasEnMora, ...seleccionadasValidas];
    const cuotasUnicas = Array.from(
      new Map(merged.map((c: any) => [c.id ?? c.installment_number, c])).values()
    );

    // Ordenar de más antigua a más reciente (FIFO)
    cuotasUnicas.sort(
      (a: any, b: any) =>
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    if (cuotasUnicas.length === 0) {
      return;
    }

    this.selectedFees = cuotasUnicas;
    this.isDrawerOpen = true;
    this.cdr.detectChanges();
  }

  get hasPendingPaymentsForGeneralFlow(): boolean {
    return this.getRegularPendingInstallmentsSorted().length > 0;
  }

  get generalPayButtonLabel(): string {
    return this.hasPendingPaymentsForGeneralFlow ? 'Pagar' : 'No hay pagos pendientes';
  }

  openGeneralPaymentDrawer(): void {
    const regularPendingInstallments = this.getRegularPendingInstallmentsSorted();
    if (regularPendingInstallments.length === 0) {
      return;
    }

    const overdueInstallments = regularPendingInstallments.filter((fee: any) => this.isVencida(fee?.due_date));

    const suggestedAmount = overdueInstallments.length > 0
      ? overdueInstallments.reduce((sum: number, fee: any) => sum + this.financials.getFeeDebtValue(fee), 0)
      : this.financials.getFeeDebtValue(regularPendingInstallments[0]);

    this.isGeneralPaymentFlow = true;
    this.drawerSuggestedAmount = Math.round(suggestedAmount);
    this.selectedFees = [];
    this.isDrawerOpen = true;
    this.cdr.detectChanges();
  }

  private getRegularPendingInstallmentsSorted(): any[] {
    return [...(this.amortizationPlan ?? [])]
      .filter((fee: any) => Number(fee?.installment_number) > 0)
      .filter((fee: any) => !isPaidStatus(this.getFeeStatus(fee)))
      .sort((a: any, b: any) => {
        const dueA = a?.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
        const dueB = b?.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;

        if (dueA === dueB) {
          return Number(a?.installment_number ?? 0) - Number(b?.installment_number ?? 0);
        }

        return dueA - dueB;
      });
  }

  closeDrawer(): void {
    this.isProcessingPayment = false;
    this.isDrawerOpen = false;
    this.isGeneralPaymentFlow = false;
    this.drawerSuggestedAmount = null;
    this.clearTableSelection();
  }

  get initialFee(): any {
    return this.financials.initialFee(this.amortizationPlan, this.contractData);
  }

  get initialFeeTotal(): number {
    return this.financials.initialFeeTotal(this.amortizationPlan, this.contractData);
  }

  get initialFeeBalance(): number {
    return this.financials.initialFeeBalance(this.amortizationPlan, this.contractData);
  }

  get initialFeePaid(): number {
    return this.financials.initialFeePaid(this.amortizationPlan, this.contractData);
  }

  get initialFeeProgress(): number {
    return this.financials.initialFeeProgress(this.amortizationPlan, this.contractData);
  }

  get activationThreshold(): number {
    return this.financials.activationThreshold(this.contractData);
  }

  getFeeStatus(fee: any): string {
    return this.financials.getFeeStatus(fee, this.amortizationPlan, this.contractData);
  }

  get totalPaidAmount(): number {
    return this.financials.totalPaidAmount(this.contractData);
  }

  get totalOutstandingAmount(): number {
    return this.financials.totalOutstandingAmount(this.totalWithInterest, this.contractData);
  }

  get overallPendingBalance(): number {
    return this.totalOutstandingAmount;
  }

  get totalInterestPaid(): number {
    return this.financials.totalInterestPaid(this.amortizationPlan, this.contractData);
  }

  abrirHistorialPagos(): void {
    this.isLoadingHistory = true;
    this.transactions = [];
    this.isHistoryModalOpen = true;
    this.cdr.detectChanges();

    this.recaudoService.getTransactionsByContract(this.contractId).subscribe({
      next: (response) => {
        const payload = response?.data ?? response ?? [];
        this.transactions = Array.isArray(payload) ? payload : [];
        this.isLoadingHistory = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.transactions = [];
        this.isLoadingHistory = false;
        this.cdr.detectChanges();
      },
    });
  }

  cerrarHistorialPagos(): void {
    this.isHistoryModalOpen = false;
    this.isLoadingHistory = false;
    this.transactions = [];
  }

  verComprobante(receiptUrl: string): void {
  if (!receiptUrl) {
    return;
  }

  this.recaudoService.getReceipt(receiptUrl).subscribe({
    next: (response) => {
      const blob = response.body;

      if (!blob) {
        console.error('El recibo llegó vacío');
        return;
      }

      const fileUrl = URL.createObjectURL(blob);

      window.open(fileUrl, '_blank');

      setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 60000);
    },
    error: (err) => {
      console.error('Error al abrir el recibo', err);
    }
  });
}

  get initialPaymentTransactions(): any[] {
    return (this.contractData?.transactions ?? []).filter((tx: any) => {
      const type = String(tx.transaction_type ?? tx.type ?? '').toLowerCase();
      return type === 'down_payment' || type === 'down-payment';
    });
  }

  get overdueFees(): any[] {
    return this.financials.overdueFees(this.amortizationPlan, this.contractData);
  }

  get cuotasVencidas(): any[] {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return (this.amortizationPlan ?? []).filter((cuota: any) => {
      if (isPaidStatus(cuota?.status)) {
        return false;
      }

      const saldoPendiente = Number(
        cuota?.saldo_pendiente ??
        cuota?.projected_balance ??
        cuota?.remaining_balance ??
        cuota?.amount ??
        cuota?.quota_debt ??
        cuota?.installment_value ??
        0
      );

      if (saldoPendiente < 500) {
        return false;
      }

      const fechaVencimiento = cuota?.due_date ? new Date(cuota.due_date) : null;
      if (!fechaVencimiento || Number.isNaN(fechaVencimiento.getTime())) {
        return false;
      }

      fechaVencimiento.setHours(0, 0, 0, 0);
      return fechaVencimiento < hoy;
    });
  }

  get cantidadCuotasVencidas(): number {
    return this.cuotasVencidas.length;
  }

  get totalDineroVencido(): number {
    return this.cuotasVencidas.reduce(
      (sum: number, cuota: any) => sum + this.financials.getFeeDebtValue(cuota),
      0,
    );
  }

  get tieneCarteraVencida(): boolean {
    return this.cantidadCuotasVencidas > 0;
  }

  get activeMoraFees(): any[] {
    return this.financials.activeMoraFees(this.amortizationPlan, this.contractData);
  }

  get hasOverdueFees(): boolean {
    return this.overdueFees.length > 0;
  }

  get hasActiveMora(): boolean {
    return this.tieneCarteraVencida;
  }

  get regularPaymentTotal(): number {
    const regularPayments = (this.contractData?.transactions ?? []).filter((tx: any) => {
      const type = String(tx.transaction_type ?? tx.type ?? '').toLowerCase();
      return type === 'regular_payment' || type === 'regular payment';
    });

    return regularPayments.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
  }

  get activeMoraDebt(): number {
    return this.financials.activeMoraDebt(this.amortizationPlan, this.contractData, (fee: any) => this.getFeeDebtValue(fee));
  }

  get activeMoraFeeLabel(): string {
    const firstFee = this.activeMoraFees[0];
    if (!firstFee) return 'Cuota';
    return firstFee.installment_number === 0 ? 'Cuota inicial' : `Cuota #${firstFee.installment_number}`;
  }

  get overdueLevelLabel(): string {
    const count = this.overdueFees.length;

    if (count === 0) return 'Sin mora';
    if (count <= 2) return 'Nivel de antigüedad: 0 a 30 días';
    if (count <= 4) return 'Nivel de antigüedad: 31 a 60 días';
    return 'Nivel de antigüedad: 61+ días';
  }

  get overdueAmount(): number {
    const overdueBalance = this.overdueFees.reduce((sum, fee) => sum + Number(fee.overdue_balance || 0), 0);

    if (overdueBalance > 0) {
      return overdueBalance;
    }

    if (this.currentView === 'preventa' && this.initialFee) {
      return this.initialFeeBalance;
    }

    return 0;
  }

  openPreventaPayment(): void {
    if (!this.initialFee) return;

    const remainingInitialFee = this.initialFeeBalance;
    if (remainingInitialFee <= 0) {
      return;
    }

    this.selectedFees = [{
      ...this.initialFee,
      installment_value: remainingInitialFee,
      remaining_balance: remainingInitialFee,
      overdue_balance: remainingInitialFee,
    }];

    this.openDrawer();
  }

  procesarPago(paymentData: any): void {
    this.isProcessingPayment = true;

    const transactionType = !this.isGeneralPaymentFlow && this.selectedFees.some((fee: any) => Number(fee.installment_number) === 0)
      ? 'down_payment'
      : 'regular_payment';

    const formData = new FormData();

    formData.append('amount', String(paymentData.amount ?? 0));
    formData.append('payment_method', paymentData.payment_method ?? '');
    formData.append('transaction_date', paymentData.transaction_date ?? '');
    formData.append('payment_date', paymentData.payment_date ?? paymentData.transaction_date ?? '');
    formData.append('transaction_type', transactionType);

    const paymentOption = paymentData.payment_option ?? paymentData.surplus_action;
    if (paymentOption) {
      formData.append('payment_option', String(paymentOption));
    }

    if (!this.isGeneralPaymentFlow && this.selectedFees.length) {
      this.selectedFees.forEach((fee: any) => {
        // El plan persistido siempre trae id; installment_number no se usa como fallback.
        formData.append('installment_numbers[]', String(Number(fee.id)));
        formData.append('selected_installments[]', String(Number(fee.id)));
      });
    }

    if (paymentData.bank_account_id) {
      formData.append('bank_account_id', String(paymentData.bank_account_id));
    }

    if (paymentData.receipt) {
      formData.append('receipt', paymentData.receipt);
    }

    this.recaudoService.registerPayment(this.contractId, formData, transactionType).subscribe({
      next: () => {
        this.isProcessingPayment = false;
        this.isDrawerOpen = false;
        this.clearTableSelection();

        this.toast.show(
          'Pago registrado',
          'success',
          'El abono se aplicó correctamente a la cuota seleccionada.',
        );
        this.cdr.detectChanges();

        this.cargarTablaAmortizacion();
        this.loadContractData();
      },
      error: (err) => {
        this.isProcessingPayment = false;

        const backendErrors = err?.error?.errors ?? null;
        const firstMessage = backendErrors
          ? Object.values(backendErrors)
              .flat()
              .find((msg: unknown) => typeof msg === 'string')
          : null;

        this.toast.show(
          'No se pudo registrar el pago',
          'error',
          firstMessage ? String(firstMessage) : undefined,
        );
        console.error('Error al registrar pago:', err);
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.pageTitle.clear();
  }

  private buildContractTitle(contract: any): string {
    const contractNumber = contract?.contract_number;
    const number = contractNumber
      ? String(contractNumber)
      : `#${contract?.id || this.contractId}`;
    const customer = contract?.customer ?? {};
    const customerName = customer.name || customer.nombre || contract?.customer_name || '';
    return customerName ? `Contrato ${number} — ${customerName}` : `Contrato ${number}`;
  }

  getContractStatusLabel(status: string): string {
    const pipe = new ContractStatusLabelPipe();
    return pipe.transform(status);
  }

  getPaymentMethodName(method: string): string {
    const pipe = new PaymentMethodNamePipe();
    return pipe.transform(method);
  }

  private readFirstBackendError(err: any): string | undefined {
    const backendErrors = err?.error?.errors ?? null;
    const firstMessage = backendErrors
      ? Object.values(backendErrors)
          .flat()
          .find((msg: unknown) => typeof msg === 'string')
      : null;

    if (firstMessage) {
      return String(firstMessage);
    }

    if (typeof err?.error?.message === 'string' && err.error.message.trim()) {
      return err.error.message;
    }

    return undefined;
  }
}
