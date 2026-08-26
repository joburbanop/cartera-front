import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaymentPromise } from '../models/payment-promise.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentPromiseService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/contracts';

  getPromisesByContract(contractId: number): Observable<PaymentPromise[]> {
    return this.http.get<PaymentPromise[]>(`${this.apiUrl}/${contractId}/payment-promises`);
  }
}
