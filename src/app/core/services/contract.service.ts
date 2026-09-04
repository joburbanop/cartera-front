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

  getContracts(params?: { lotId?: number; page?: number; perPage?: number }): Observable<ApiListResponse<Contract>> {
    const httpParams: Record<string, string | number> = {};

    if (params?.lotId) {
      httpParams['lot_id'] = params.lotId;
    }
    if (params?.page) {
      httpParams['page'] = params.page;
    }
    if (params?.perPage) {
      httpParams['per_page'] = params.perPage;
    }

    return this.http.get<ApiListResponse<Contract>>(this.apiUrl, { params: httpParams });
  }

  getContractById(id: number): Observable<ApiResourceResponse<Contract>> {
    return this.http.get<ApiResourceResponse<Contract>>(`${this.apiUrl}/${id}`);
  }
}
