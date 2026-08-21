import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FinancialService {
  
  /**
   * Calcula la cuota fija mensual usando el Sistema de Amortización Francés
   */
  calculateFrenchQuota(principal: number, months: number, interestRate: number): number {
    if (principal <= 0 || months <= 0) return 0;
    
    const r = interestRate / 100;
    
    // Si la tasa es 0, es una simple división
    if (r === 0) {
      return principal / months;
    }

    // Fórmula financiera
    return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  }

  /**
   * Calcula el costo total final del lote (Cuotas + Inicial)
   */
  calculateProjectedTotal(monthlyQuota: number, months: number, downPayment: number): number {
    if (monthlyQuota <= 0 || months <= 0) return 0;
    return (monthlyQuota * months) + downPayment;
  }
}