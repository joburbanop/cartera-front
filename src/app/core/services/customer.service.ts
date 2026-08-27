import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Customer {
  id?: number;
  name?: string;
  document_number?: string;
  document?: string;
  phone?: string;
  email?: string;
  document_type?: string;
  address?: string | null;
  city?: string | null;
}

export interface CreateCustomerPayload {
  document_type: string;
  document_number: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/customers';

  getCustomers(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  createCustomer(customer: CreateCustomerPayload | Partial<Customer>): Observable<any> {
    return this.http.post(this.apiUrl, customer);
  }
}
