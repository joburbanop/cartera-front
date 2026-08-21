import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  private http = inject(HttpClient);

  private apiUrl = 'http://127.0.0.1:8000/api';

  getContracts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/contracts`);
  }

  createDownPayment(
    contractId: number,
    data: FormData
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/contracts/${contractId}/transactions/down-payment`,
      data
    );
  }
}