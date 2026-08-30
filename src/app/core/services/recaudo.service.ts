import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, ApiResourceResponse } from '../models/api-response';
import { Transaction } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class RecaudoService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  registerPayment(contractId: number, formData: FormData, transactionType: string = 'regular_payment'): Observable<ApiResourceResponse<Transaction>> {
    if (!formData.has('contract_id')) {
      formData.append('contract_id', contractId.toString());
    }

    const endpoint = transactionType === 'down_payment'
      ? `${this.apiUrl}/contracts/${contractId}/transactions/down-payment`
      : `${this.apiUrl}/collections/cascade`;

    return this.http.post<ApiResourceResponse<Transaction>>(endpoint, formData);
  }

  /**
   * Registra un abono a la cuota inicial (Preventa)
   * Usa FormData porque incluye el archivo (receipt)
   */
  registerDownPayment(contractId: number, formData: FormData): Observable<ApiResourceResponse<Transaction>> {
    return this.registerPayment(contractId, formData, 'down_payment');
  }

  getTransactionsByContract(contractId: number): Observable<ApiListResponse<Transaction>> {
    return this.http.get<ApiListResponse<Transaction>>(`${this.apiUrl}/contracts/${contractId}/transactions`);
  }

  getAllTransactions(filters?: Record<string, string | number>): Observable<ApiListResponse<Transaction>> {
    const params = filters ? { ...filters } : {};
    return this.http.get<ApiListResponse<Transaction>>(`${this.apiUrl}/transactions`, { params });
  }

  getReceipt(receiptUrl: string): Observable<HttpResponse<Blob>> {
    return this.http.get(receiptUrl, {
      responseType: 'blob',
      observe: 'response',
    });
  }
}
