import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AmortizationService } from '../../../core/services/amortization.service';
import { ContractService } from '../../../core/services/contract.service';
import { FinancialService } from '../../../core/services/financial.service'; 
import { DrawerPagoComponent } from '../../../shared/components/drawer-pago/drawer-pago.component';
import { ReactiveFormsModule } from '@angular/forms';
import { RecaudoService } from '../../../core/services/recaudo.service';

@Component({
  selector: 'app-tabla-amortizacion',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, DrawerPagoComponent],
  templateUrl: './tabla-amortizacion.component.html',
  styleUrl: './tabla-amortizacion.component.scss'
})
export class AmortizationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private amortizationService = inject(AmortizationService);
  private contractService = inject(ContractService);
  private financialService = inject(FinancialService);
  private cdr = inject(ChangeDetectorRef);
  private recaudoService = inject(RecaudoService);

  contractId!: number;
  contractData: any = null;
  amortizationPlan: any[] = [];
  totalWithInterest: number = 0;
  isLoading = true;
  isGenerating = false;
  
  // Variables del Cajero (Drawer)
  selectedFees: any[] = [];
  isDrawerOpen = false;
  isProcessingPayment = false;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.contractId = Number(params['id']);
        this.loadContractData();
        this.loadAmortizationPlan();
      }
    });
  }

  loadContractData() {
    this.contractService.getContractById(this.contractId).subscribe({
      next: (response) => {
        this.contractData = response.data || response;
        this.setDefaultView();
        this.calculateFinancials();
        this.cdr.detectChanges();
      },
      error: () => this.router.navigate(['/contracts'])
    });
  }

  loadAmortizationPlan() {
    this.amortizationService.getPlan(this.contractId).subscribe({
      next: (response) => {
        const plan = response.data || [];

        if (Array.isArray(plan) && plan.length === 0) {
          this.generatePlan();
          return;
        }

        this.amortizationPlan = plan;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando plan', err);
        this.isLoading = false;
      }
    });
  }

  private syncInitialFeeStatusFromPayment(amount: number) {
    if (!this.amortizationPlan.length) return;

    const contractDownPayment = Number(this.contractData?.down_payment_pactada || 0);
    const currentPaid = this.initialFeePaid + Number(amount || 0);
    const nextStatus = currentPaid >= contractDownPayment
      ? 'pagada'
      : currentPaid > 0
        ? 'parcial'
        : 'sin_pagar';

    this.amortizationPlan = this.amortizationPlan.map((fee: any) => {
      if (fee.installment_number !== 0) return fee;

      return {
        ...fee,
        status: nextStatus,
        installment_value: Number(fee.installment_value || contractDownPayment)
      };
    });
  }

  private syncSelectedPaymentRowsFromBackend() {
    const selectedNumbers = this.selectedFees.map((fee: any) => Number(fee.installment_number));

    if (!selectedNumbers.length) {
      this.loadAmortizationPlan();
      return;
    }

    this.amortizationService.getPlan(this.contractId).subscribe({
      next: (response) => {
        const plan = response.data || [];
        this.amortizationPlan = plan;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadAmortizationPlan();
      }
    });
  }

  generatePlan() {
    this.isGenerating = true;
    this.amortizationService.generatePlan(this.contractId).subscribe({
      next: () => {
        this.isGenerating = false;
        this.loadAmortizationPlan();
      },
      error: (err) => {
        console.error('Error generando plan', err);
        this.isGenerating = false;
      }
    });
  }

  calculateFinancials() {
    if (!this.contractData) return;

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

  isFeeSelectable(fee: any): boolean {
    const status = this.getFeeStatus(fee);
    return status !== 'pagada';
  }

  // ==========================================
  // LÓGICA DE SELECCIÓN Y SUMA (AQUÍ ESTÁ LA MAGIA)
  // ==========================================
  toggleFeeSelection(fee: any, event: any) {
    if (!this.isFeeSelectable(fee)) {
      event.target.checked = false;
      return;
    }

    if (event.target.checked) {
      // AQUÍ ELIMINAMOS EL .PUSH(). ESTO OBLIGA A ANGULAR A REACCIONAR INMEDIATAMENTE
      this.selectedFees = [...this.selectedFees, fee];
    } else {
      this.selectedFees = this.selectedFees.filter(f => f.installment_number !== fee.installment_number);
    }
  }

  isSelected(fee: any): boolean {
    return this.selectedFees.some(f => f.installment_number === fee.installment_number);
  }

  get totalSelectedAmount(): number {
    // AQUÍ TAMBIÉN NOS ASEGURAMOS DE QUE SUME SOLO LA CUOTA
    return this.selectedFees.reduce((sum, fee) => sum + Number(fee.installment_value || 0), 0);
  }

// ==========================================
  // CONTROLADOR DEL DRAWER (LEGO)
  // ==========================================
  openDrawer() {
    console.log('¡Clic detectado! Abriendo el cajero...'); // Para comprobar en consola
    this.isDrawerOpen = true;
    this.cdr.detectChanges(); // ⚡ ¡Electrochoque! Fuerza a Angular a pintar el panel lateral
  }

  closeDrawer() {
    this.isProcessingPayment = false;
    this.isDrawerOpen = false;
    this.selectedFees = [];
    this.cdr.detectChanges();
  }


  // ==========================================
  // VISTAS: VENTA vs PREVENTA
  // ==========================================
  currentView: 'venta' | 'preventa' = 'venta';

  // Llama a esta función dentro de loadContractData() justo después de que llegue la respuesta
  setDefaultView() {
    // Si el contrato viene como inactivo desde la base de datos, lo forzamos a la vista Preventa
    if (this.contractData?.status === 'preventa_inactiva') {
      this.currentView = 'preventa';
    } else {
      this.currentView = 'venta';
    }
  }

  // --- LÓGICA DE PREVENTA ---
  get initialFee(): any {
    return this.amortizationPlan.find(f => f.installment_number === 0);
  }

  get initialFeeTotal(): number {
    return Number(this.initialFee?.installment_value || this.contractData?.down_payment_pactada || 0);
  }

  get initialFeeBalance(): number {
    return Math.max(0, this.initialFeeTotal - this.initialFeePaid);
  }

  get initialFeePaid(): number {
    const transactions = this.contractData?.transactions ?? [];

    if (Array.isArray(transactions) && transactions.length > 0) {
      return transactions
        .filter((tx: any) => {
          const type = String(tx.transaction_type ?? tx.type ?? '').toLowerCase();
          return type === 'down_payment' || type === 'down-payment';
        })
        .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
    }

    if (!this.initialFee) return 0;

    if (this.initialFee.status === 'pagada') {
      return this.initialFeeTotal;
    }

    if (this.initialFee.status === 'parcial') {
      return Number(this.initialFee.amount_paid || 0);
    }

    return 0;
  }

  get initialFeeProgress(): number {
    if (this.initialFeeTotal === 0) return 0;
    
    const progress = (this.initialFeePaid / this.initialFeeTotal) * 100;
    
    // Aseguramos que la barra no se desborde del 100% ni baje del 0%
    return Math.min(100, Math.max(0, progress));
  }

  getFeeStatus(fee: any): string {
    if (fee?.installment_number === 0) {
      const paid = this.initialFeePaid;
      const threshold = this.activationThreshold;

      if (paid >= threshold) return 'pagada';
      if (paid > 0) return 'parcial';
      return 'sin_pagar';
    }

    return String(fee?.status || 'sin_pagar');
  }

// --- LÓGICA DE PREVENTA: activar cuando se complete la cuota inicial pactada ---
  get activationThreshold(): number {
    return Number(this.contractData?.down_payment_pactada || 0);
  }

  get totalPaidAmount(): number {
    return (this.contractData?.transactions ?? []).reduce((sum: number, tx: any) => {
      return sum + Number(tx.amount || 0);
    }, 0);
  }

  get totalOutstandingAmount(): number {
    return Math.max(0, this.totalWithInterest - this.totalPaidAmount);
  }

  get overallPendingBalance(): number {
    return this.totalOutstandingAmount;
  }

  get totalInterestPaid(): number {
    return (this.amortizationPlan ?? []).reduce((sum: number, fee: any) => {
      const status = this.getFeeStatus(fee);
      if (status === 'pagada' || status === 'parcial') {
        return sum + Number(fee.interest_value || 0);
      }
      return sum;
    }, 0);
  }

  get initialPaymentTransactions(): any[] {
    return (this.contractData?.transactions ?? []).filter((tx: any) => {
      const type = String(tx.transaction_type ?? tx.type ?? '').toLowerCase();
      return type === 'down_payment' || type === 'down-payment';
    });
  }

  get overdueFees(): any[] {
    return (this.amortizationPlan ?? [])
      .filter((fee: any) => this.getFeeStatus(fee) === 'vencida')
      .map((fee: any) => {
        const installmentValue = Number(fee.installment_value || 0);
        const remainingBalance = Number(fee.remaining_balance ?? installmentValue ?? 0);

        return {
          ...fee,
          overdue_balance: Math.max(0, Math.min(installmentValue, Math.max(0, remainingBalance)))
        };
      })
      .filter((fee: any) => Number(fee.installment_value || 0) > 0);
  }

  get hasOverdueFees(): boolean {
    return this.overdueFees.length > 0;
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

  // Función para abrir el cajero EXCLUSIVAMENTE para la cuota inicial
  openPreventaPayment() {
    if (!this.initialFee) return;

    const remainingInitialFee = this.initialFeeBalance;

    if (remainingInitialFee <= 0) {
      return;
    }

    this.selectedFees = [{
      ...this.initialFee,
      installment_value: remainingInitialFee,
      remaining_balance: remainingInitialFee,
      overdue_balance: remainingInitialFee
    }];

    this.openDrawer();
  }

  

  processPayment(paymentData: any) {
    this.isProcessingPayment = true;

    const transactionType = this.selectedFees.some(f => Number(f.installment_number) === 0)
      ? 'down_payment'
      : 'regular_payment';

    const formData = new FormData();
    formData.append('amount', paymentData.amount);
    formData.append('transaction_date', paymentData.transaction_date);
    formData.append('payment_method', paymentData.payment_method);
    formData.append('transaction_type', transactionType);

    if (this.selectedFees.length) {
      this.selectedFees.forEach((fee: any) => {
        formData.append('installment_numbers[]', String(fee.installment_number));
      });
    }

    formData.append('receipt', paymentData.receipt);

    if (paymentData.bank_account_id) {
      formData.append('bank_account_id', paymentData.bank_account_id);
    }

    this.recaudoService.registerPayment(this.contractId, formData, transactionType).subscribe({
      next: () => {
        this.isProcessingPayment = false;
        this.isDrawerOpen = false;
        this.selectedFees = [];
        this.currentView = 'preventa';
        this.cdr.detectChanges();

        this.contractService.getContractById(this.contractId).subscribe({
          next: (response) => {
            this.contractData = response.data || response;
            this.setDefaultView();
            this.calculateFinancials();

            if (transactionType === 'down_payment') {
              this.syncInitialFeeStatusFromPayment(Number(paymentData.amount || 0));
            }

            this.loadAmortizationPlan();
            this.cdr.detectChanges();
          },
          error: () => {
            if (transactionType === 'down_payment') {
              this.syncInitialFeeStatusFromPayment(Number(paymentData.amount || 0));
            }
            this.loadContractData();
          }
        });

        alert('¡Abono registrado con éxito!');
      },
      error: (err) => {
        this.isProcessingPayment = false;
        this.cdr.detectChanges();
        console.error('Error del API:', err);

        if (err.error && err.error.message) {
          alert('Error de validación: ' + err.error.message);
        } else {
          alert('Ocurrió un error inesperado al registrar el pago en el servidor.');
        }
      }
    });
  }

  // ==========================================
  // HELPERS (Agrega esto al final de tu clase)
  // ==========================================
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

  getPaymentMethodName(method: string): string {
    const methods: { [key: string]: string } = {
      'transfer': 'Transferencia',
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'barter': 'Permuta'
    };
    return methods[method] || method;
  }
}