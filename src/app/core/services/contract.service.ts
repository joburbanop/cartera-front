import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, ApiResourceResponse } from '../models/api-response';
import { Contract } from '../models/contract.model';

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/contracts`;

  createContract(data: Partial<Contract> | Record<string, unknown>): Observable<ApiResourceResponse<Contract>> {
    return this.http.post<ApiResourceResponse<Contract>>(this.apiUrl, data);
  }

  getContracts(): Observable<ApiListResponse<Contract>> {
    return this.http.get<ApiListResponse<Contract>>(this.apiUrl);
  }

  getContractById(id: number): Observable<ApiResourceResponse<Contract>> {
    return this.http.get<ApiResourceResponse<Contract>>(`${this.apiUrl}/${id}`);
  }
}
