import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AmortizationService } from '../../../core/services/amortization.service';
import { ContractService } from '../../../core/services/contract.service';
import { FinancialService } from '../../../core/services/financial.service'; 
import { DrawerPagoComponent } from '../../../shared/components/drawer-pago/drawer-pago.component';
import { ReactiveFormsModule } from '@angular/forms';

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
        this.calculateFinancials();
        this.cdr.detectChanges();
      },
      error: () => this.router.navigate(['/contracts'])
    });
  }

  loadAmortizationPlan() {
    this.amortizationService.getPlan(this.contractId).subscribe({
      next: (response) => {
        this.amortizationPlan = response.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando plan', err);
        this.isLoading = false;
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
    return fee.status !== 'pagada';
  }

  // ==========================================
  // LÓGICA DE SELECCIÓN Y SUMA (AQUÍ ESTÁ LA MAGIA)
  // ==========================================
  toggleFeeSelection(fee: any, event: any) {
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
    this.isDrawerOpen = false;
    this.cdr.detectChanges(); // ⚡ Refresca la pantalla al cerrar
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
    if (!this.initialFee) return 0;
    
    // Si ya está pagada completa, lo pagado es igual al total
    if (this.initialFee.status === 'pagada') {
      return this.initialFeeTotal;
    }
    
    // Si está parcial, necesitamos que el backend nos diga cuánto abonó. 
    // (Asegúrate de que tu backend envíe un campo 'amount_paid' o similar cuando esté en estado parcial).
    if (this.initialFee.status === 'parcial') {
      return Number(this.initialFee.amount_paid || 0); 
    }
    
    // Si está 'sin_pagar' o 'vencida', lo pagado es 0
    return 0;
  }

  get initialFeeProgress(): number {
    if (this.initialFeeTotal === 0) return 0;
    
    const progress = (this.initialFeePaid / this.initialFeeTotal) * 100;
    
    // Aseguramos que la barra no se desborde del 100% ni baje del 0%
    return Math.min(100, Math.max(0, progress));
  }

// --- LÓGICA DEL 10% (NUEVA REGLA DE NEGOCIO) ---
  get activationThreshold(): number {
    // Calculamos el 10% sobre el valor total financiado (precio final con intereses)
    return this.totalWithInterest * 0.10;
  }

  // Función para abrir el cajero EXCLUSIVAMENTE para la cuota inicial
  openPreventaPayment() {
    if (this.initialFee) {
      this.selectedFees = [this.initialFee]; 
      this.openDrawer(); 
    }
  }

  

  processPayment(paymentData: any) {
    this.isProcessingPayment = true;
    console.log('Datos listos para enviar al backend:', paymentData);
    console.log('Cuotas que se van a pagar:', this.selectedFees);

    setTimeout(() => {
      this.isProcessingPayment = false;
      this.closeDrawer();
      this.selectedFees = []; 
      alert('Pago registrado en el front. Falta conectar backend.');
    }, 1500);
  }

  // ==========================================
  // HELPERS (Agrega esto al final de tu clase)
  // ==========================================
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