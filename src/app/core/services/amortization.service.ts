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
}
