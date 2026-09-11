import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiListResponse,
  ApiResourceResponse
} from '../models/api-response';
import {
  BankAccount,
  CreateBankAccountPayload,
  UpdateBankAccountPayload
} from '../models/bank-account.model';

@Injectable({
  providedIn: 'root'
})
export class BankAccountService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/bank-accounts`;

  getAccounts(params?: {
    page?: number;
    perPage?: number;
  }): Observable<ApiListResponse<BankAccount>> {
    let httpParams = new HttpParams();

    if (params?.page) {
      httpParams = httpParams.set('page', params.page);
    }

    if (params?.perPage) {
      httpParams = httpParams.set('per_page', params.perPage);
    }

    return this.http.get<ApiListResponse<BankAccount>>(
      this.apiUrl,
      { params: httpParams }
    );
  }

  getArchivedAccounts(params?: {
    page?: number;
    perPage?: number;
  }): Observable<ApiListResponse<BankAccount>> {
    let httpParams = new HttpParams();

    if (params?.page) {
      httpParams = httpParams.set('page', params.page);
    }

    if (params?.perPage) {
      httpParams = httpParams.set('per_page', params.perPage);
    }

    return this.http.get<ApiListResponse<BankAccount>>(
      `${this.apiUrl}/archived`,
      { params: httpParams }
    );
  }

  createAccount(
    data: CreateBankAccountPayload
  ): Observable<ApiResourceResponse<BankAccount>> {
    return this.http.post<ApiResourceResponse<BankAccount>>(
      this.apiUrl,
      data
    );
  }

  updateAccount(
    id: number,
    data: UpdateBankAccountPayload
  ): Observable<ApiResourceResponse<BankAccount>> {
    return this.http.put<ApiResourceResponse<BankAccount>>(
      `${this.apiUrl}/${id}`,
      data
    );
  }

  archiveAccount(id: number): Observable<ApiResourceResponse<null>> {
    return this.http.patch<ApiResourceResponse<null>>(
      `${this.apiUrl}/${id}/archive`,
      {}
    );
  }

  restoreAccount(
    id: number
  ): Observable<ApiResourceResponse<BankAccount>> {
    return this.http.patch<ApiResourceResponse<BankAccount>>(
      `${this.apiUrl}/${id}/restore`,
      {}
    );
  }
}