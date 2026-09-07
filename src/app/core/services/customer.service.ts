import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, ApiResourceResponse } from '../models/api-response';
import { Contract } from '../models/contract.model';
import { CreateCustomerPayload, Customer } from '../models/customer.model';

export type { Customer, CreateCustomerPayload };

export type CustomerDetail = Customer & { contracts: Contract[] };

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/customers`;

  getCustomers(): Observable<ApiListResponse<Customer>> {
    return this.http.get<ApiListResponse<Customer>>(this.apiUrl);
  }

  getCustomerById(id: number): Observable<ApiResourceResponse<CustomerDetail>> {
    return this.http.get<ApiResourceResponse<CustomerDetail>>(`${this.apiUrl}/${id}`);
  }
  getArchivedCustomers(): Observable<ApiListResponse<Customer>> {
  return this.http.get<ApiListResponse<Customer>>(
    `${this.apiUrl}/archived`
  );
}

  createCustomer(customer: CreateCustomerPayload | Partial<Customer>): Observable<ApiResourceResponse<Customer>> {
    return this.http.post<ApiResourceResponse<Customer>>(this.apiUrl, customer);
  }
  archiveCustomer(id: number): Observable<ApiResourceResponse<null>> {
  return this.http.delete<ApiResourceResponse<null>>(
    `${this.apiUrl}/${id}`
  );
  }

  activateCustomer(id: number): Observable<ApiResourceResponse<null>> {
  return this.http.post<ApiResourceResponse<null>>(
    `${this.apiUrl}/${id}/activate`,
    {}
  );
  }
 updateCustomer(
  id: number,
  customer: CreateCustomerPayload | Partial<Customer>
): Observable<ApiResourceResponse<Customer>> {
  return this.http.put<ApiResourceResponse<Customer>>(
    `${this.apiUrl}/${id}`,
    customer
  );
}
}
