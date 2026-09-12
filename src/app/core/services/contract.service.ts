import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, ApiResourceResponse } from '../models/api-response';
import { Contract } from '../models/contract.model';

export interface ContractListFilters {
  contract_number?: string;
  customer?: string;
  project_id?: string | number;
  lot_number?: string;
  status?: string;
  exclude_status?: string;
  cartera?: string;
  start_date_from?: string;
  start_date_to?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/contracts`;

  createContract(data: Partial<Contract> | Record<string, unknown>): Observable<ApiResourceResponse<Contract>> {
    return this.http.post<ApiResourceResponse<Contract>>(this.apiUrl, data);
  }

  getContracts(params?: {
    lotId?: number;
    page?: number;
    perPage?: number;
  } & ContractListFilters): Observable<ApiListResponse<Contract>> {
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
    if (params?.contract_number) {
      httpParams['contract_number'] = params.contract_number;
    }
    if (params?.customer) {
      httpParams['customer'] = params.customer;
    }
    if (params?.project_id) {
      httpParams['project_id'] = params.project_id;
    }
    if (params?.lot_number) {
      httpParams['lot_number'] = params.lot_number;
    }
    if (params?.status) {
      httpParams['status'] = params.status;
    }
    if (params?.exclude_status) {
      httpParams['exclude_status'] = params.exclude_status;
    }
    if (params?.cartera) {
      httpParams['cartera'] = params.cartera;
    }
    if (params?.start_date_from) {
      httpParams['start_date_from'] = params.start_date_from;
    }
    if (params?.start_date_to) {
      httpParams['start_date_to'] = params.start_date_to;
    }

    return this.http.get<ApiListResponse<Contract>>(this.apiUrl, { params: httpParams });
  }

  getArchivedContracts(params?: {
    page?: number;
    perPage?: number;
  } & ContractListFilters): Observable<ApiListResponse<Contract>> {
    const httpParams: Record<string, string | number> = {};

    if (params?.page) {
      httpParams['page'] = params.page;
    }

    if (params?.perPage) {
      httpParams['per_page'] = params.perPage;
    }

    if (params?.contract_number) {
      httpParams['contract_number'] = params.contract_number;
    }

    if (params?.customer) {
      httpParams['customer'] = params.customer;
    }

    if (params?.project_id) {
      httpParams['project_id'] = params.project_id;
    }

    if (params?.lot_number) {
      httpParams['lot_number'] = params.lot_number;
    }

    if (params?.status) {
      httpParams['status'] = params.status;
    }

    if (params?.cartera) {
      httpParams['cartera'] = params.cartera;
    }

    if (params?.start_date_from) {
      httpParams['start_date_from'] = params.start_date_from;
    }

    if (params?.start_date_to) {
      httpParams['start_date_to'] = params.start_date_to;
    }

    return this.http.get<ApiListResponse<Contract>>(
      `${this.apiUrl}/archived`,
      { params: httpParams }
    );
  }

  getContractById(id: number): Observable<ApiResourceResponse<Contract>> {
    return this.http.get<ApiResourceResponse<Contract>>(`${this.apiUrl}/${id}`);
  }

  updateContract(
    id: number,
    data: Partial<Contract> | Record<string, unknown>
  ): Observable<ApiResourceResponse<Contract>> {
    return this.http.put<ApiResourceResponse<Contract>>(
      `${this.apiUrl}/${id}`,
      data
    );
  }

  archiveContract(id: number): Observable<ApiResourceResponse<Contract>> {
    return this.http.patch<ApiResourceResponse<Contract>>(
      `${this.apiUrl}/${id}/archive`,
      {}
    );
  }

  restoreContract(id: number): Observable<ApiResourceResponse<Contract>> {
    return this.http.patch<ApiResourceResponse<Contract>>(
      `${this.apiUrl}/${id}/restore`,
      {}
    );
  }
}
