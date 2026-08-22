import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RecaudoService {
  private http = inject(HttpClient);
  
  // Apuntamos a tu base local directamente
  private apiUrl = 'http://127.0.0.1:8000/api';

  registerPayment(contractId: number, formData: FormData, transactionType: string = 'down_payment'): Observable<any> {
    formData.append('transaction_type', transactionType);
    return this.http.post(`${this.apiUrl}/contracts/${contractId}/transactions/down-payment`, formData);
  }

  /**
   * Registra un abono a la cuota inicial (Preventa)
   * Usa FormData porque incluye el archivo (receipt)
   */
  registerDownPayment(contractId: number, formData: FormData): Observable<any> {
    return this.registerPayment(contractId, formData, 'down_payment');
  }
}