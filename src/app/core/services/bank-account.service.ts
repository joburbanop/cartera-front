import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, ApiResourceResponse } from '../models/api-response';
import { BankAccount } from '../models/bank-account.model';

@Injectable({
  providedIn: 'root'
})
export class BankAccountService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/bank-accounts`;

  getAccounts(): Observable<ApiListResponse<BankAccount>> {
    return this.http.get<ApiListResponse<BankAccount>>(this.apiUrl);
  }

  createAccount(data: Partial<BankAccount> | Record<string, unknown>): Observable<ApiResourceResponse<BankAccount>> {
    return this.http.post<ApiResourceResponse<BankAccount>>(this.apiUrl, data);
  }
}
