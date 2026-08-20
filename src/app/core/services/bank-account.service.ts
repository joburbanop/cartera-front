import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BankAccountService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/bank-accounts';

  getAccounts(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  createAccount(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }
}