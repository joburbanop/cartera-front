import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppRole } from '../models/app-roles';
import { ApiListResponse, ApiResourceResponse } from '../models/api-response';
import { CreateUserPayload, User } from '../models/user.model';

export type { CreateUserPayload, User };

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  getUsers(): Observable<ApiListResponse<User>> {
    return this.http.get<ApiListResponse<User>>(this.apiUrl);
  }

  createUser(data: CreateUserPayload): Observable<ApiResourceResponse<User>> {
    return this.http.post<ApiResourceResponse<User>>(this.apiUrl, data);
  }

  updateUser(id: number, data: Partial<User> & { password?: string; role?: AppRole | string }): Observable<ApiResourceResponse<User>> {
    return this.http.put<ApiResourceResponse<User>>(`${this.apiUrl}/${id}`, data);
  }

  deleteUser(id: number): Observable<ApiResourceResponse<null>> {
    return this.http.delete<ApiResourceResponse<null>>(`${this.apiUrl}/${id}`);
  }
}
