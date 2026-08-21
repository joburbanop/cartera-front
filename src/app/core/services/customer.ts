import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Customer {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/customers';

  getCustomers(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  createCustomer(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }
}