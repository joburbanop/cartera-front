import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AmortizationService {
  private http = inject(HttpClient);
  // Base URL apuntando a tus rutas de Laravel
  private apiUrl = 'http://127.0.0.1:8000/api/contracts';

  // GET: Obtener el plan de un contrato
  getPlan(contractId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${contractId}/amortization`);
  }

  // POST: Generar el plan por primera vez
  generatePlan(contractId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${contractId}/generate-amortization`, {});
  }
}