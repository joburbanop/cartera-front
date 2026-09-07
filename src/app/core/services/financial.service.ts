import { Injectable } from '@angular/core';
import { roundHalfUp2 } from '../constants/financial-rules';

@Injectable({
  providedIn: 'root'
})
export class FinancialService {

  /**
   * Cuota fija mensual (sistema francés), redondeo half-up a 2 decimales.
   * Misma fórmula que `AmortizationCalculationService::calculateFixedQuota`.
   */
  calculateFrenchQuota(principal: number, months: number, interestRate: number): number {
    if (principal <= 0 || months <= 0) return 0;

    const r = interestRate / 100;

    if (r === 0) {
      return roundHalfUp2(principal / months);
    }

    const power = Math.pow(1 + r, months);
    const raw = (principal * r * power) / (power - 1);

    return roundHalfUp2(raw);
  }

  /**
   * Calcula el costo total final del lote (Cuotas + Inicial)
   */
  calculateProjectedTotal(monthlyQuota: number, months: number, downPayment: number): number {
    if (monthlyQuota <= 0 || months <= 0) return 0;
    return roundHalfUp2((monthlyQuota * months) + downPayment);
  }
}
