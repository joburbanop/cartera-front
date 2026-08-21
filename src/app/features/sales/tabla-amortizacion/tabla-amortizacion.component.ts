import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AmortizationService } from '../../../core/services/amortization.service';
import { ContractService } from '../../../core/services/contract.service';
import { FinancialService } from '../../../core/services/financial.service'; 

@Component({
  selector: 'app-tabla-amortizacion',
  standalone: true,
  imports: [CommonModule, RouterModule],
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

  ngOnInit(): void {
    // 1. Leer el ID del contrato desde la URL
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.contractId = Number(params['id']);
        this.loadContractData();
        this.loadAmortizationPlan();
      }
    });
  }

  // Cargar datos básicos del contrato, cliente y lote para la cabecera
  loadContractData() {
    // Asegúrate de tener un método getContractById en tu ContractService
    this.contractService.getContractById(this.contractId).subscribe({
      next: (response) => {
        this.contractData = response.data || response;
        this.calculateFinancials();
        this.cdr.detectChanges();
      },
      error: () => this.router.navigate(['/contracts']) // Si hay error, lo devolvemos
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
        this.loadAmortizationPlan(); // Recargar la tabla recién creada
      },
      error: (err) => {
        console.error('Error generando plan', err);
        this.isGenerating = false;
      }
    });
  }

  // --- CÁLCULO FINANCIERO USANDO TU SERVICIO ---
  calculateFinancials() {
    if (!this.contractData) return;

    const salePrice = Number(this.contractData.sale_price) || 0;
    const downPayment = Number(this.contractData.down_payment_pactada) || 0;
    const months = Number(this.contractData.term_months) || 0;
    const interestRate = Number(this.contractData.interest_rate) || 0;

    const principal = salePrice - downPayment;

    if (principal > 0 && months > 0) {
      // 1. Calculamos la cuota mensual llamando a tu servicio
      const quota = this.financialService.calculateFrenchQuota(principal, months, interestRate);
      
      // 2. Calculamos el costo total final llamando a tu servicio
      this.totalWithInterest = this.financialService.calculateProjectedTotal(quota, months, downPayment);
    } else {
      // Si no hay financiación, el total es solo el precio base
      this.totalWithInterest = salePrice;
    }
  }


}