import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AmortizationService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/contracts';

  getPlan(contractId: number, version?: number): Observable<any> {
    const url = version !== undefined ? `${this.apiUrl}/${contractId}/amortization?version=${version}` : `${this.apiUrl}/${contractId}/amortization`;
    return this.http.get(url);
  }

  getVersions(contractId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${contractId}/amortization`);
  }

  generatePlan(contractId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${contractId}/generate-amortization`, {});
  }

  downloadPdf(contractId: number, version?: number, type: 'internal' | 'client' = 'internal'): Observable<Blob> {
    const targetVersion = version ?? 1;
    return this.http.get(`${this.apiUrl}/${contractId}/download-pdf?version=${targetVersion}&type=${type}`, {
      responseType: 'blob'
    });
  }
}