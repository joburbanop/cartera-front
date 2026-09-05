import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaymentPromise } from '../models/payment-promise.model';
import { ApiListResponse } from '../models/api-response';

@Injectable({
  providedIn: 'root'
})
export class PaymentPromiseService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/contracts`;

  getPromisesByContract(contractId: number): Observable<ApiListResponse<PaymentPromise>> {
    return this.http.get<ApiListResponse<PaymentPromise>>(`${this.apiUrl}/${contractId}/payment-promises`);
  }

  reorderPromises(
    contractId: number,
    promises: Array<{ id: number; expected_date: string }>,
  ): Observable<ApiListResponse<PaymentPromise>> {
    return this.http.patch<ApiListResponse<PaymentPromise>>(
      `${this.apiUrl}/${contractId}/payment-promises/reorder`,
      { promises },
    );
  }
}
