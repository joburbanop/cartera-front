import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, ApiResourceResponse } from '../models/api-response';
import { AmortizationInstallment } from '../models/amortization-installment.model';

@Injectable({
  providedIn: 'root'
})
export class AmortizationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/contracts`;

  getPlan(contractId: number): Observable<ApiListResponse<AmortizationInstallment>> {
    return this.http.get<ApiListResponse<AmortizationInstallment>>(`${this.apiUrl}/${contractId}/amortization`);
  }

  generatePlan(contractId: number): Observable<ApiListResponse<AmortizationInstallment> | ApiResourceResponse<AmortizationInstallment[]>> {
    return this.http.post<ApiListResponse<AmortizationInstallment>>(`${this.apiUrl}/${contractId}/generate-amortization`, {});
  }

  downloadPdf(contractId: number, type: 'internal' | 'client' = 'internal'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${contractId}/download-pdf?type=${type}`, {
      responseType: 'blob'
    });
  }

  updateInstallmentDueDate(
    contractId: number,
    installmentId: number,
    dueDate: string,
    mode: 'single' | 'cascade',
    cadence: 'same_day' | 'month_end' = 'same_day',
  ): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${contractId}/installments/${installmentId}/due-date`,
      { due_date: dueDate, mode, cadence, confirm: true },
    );
  }

  previewInstallmentDueDate(
    contractId: number,
    installmentId: number,
    dueDate: string,
    mode: 'single' | 'cascade',
    cadence: 'same_day' | 'month_end' = 'same_day',
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${contractId}/installments/${installmentId}/due-date/preview`,
      { due_date: dueDate, mode, cadence },
    );
  }

  updateInstallmentPaymentDate(
    contractId: number,
    installmentId: number,
    paymentDate: string,
  ): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${contractId}/installments/${installmentId}/payment-date`,
      { payment_date: paymentDate },
    );
  }

  refinanceContract(contractId: number, tipo: string, params: Record<string, unknown>): Observable<any> {
    return this.http.post(`${this.apiUrl}/${contractId}/refinance`, {
      tipo,
      ...params,
    });
  }
}
