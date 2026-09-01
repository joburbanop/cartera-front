import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, ApiResourceResponse } from '../models/api-response';
import { Project } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/projects`;

  getProjects(): Observable<ApiListResponse<Project>> {
    return this.http.get<ApiListResponse<Project>>(this.apiUrl);
  }

  createProject(data: Partial<Project> | Record<string, unknown>): Observable<ApiResourceResponse<Project>> {
    return this.http.post<ApiResourceResponse<Project>>(this.apiUrl, data);
  }
  updateProject(
      id: number,
      data: Partial<Project> | Record<string, unknown>
    ): Observable<ApiResourceResponse<Project>> {
      return this.http.put<ApiResourceResponse<Project>>(
        `${this.apiUrl}/${id}`,
        data
      );
    }

  archiveProject(
      id: number
    ): Observable<ApiResourceResponse<Project>> {
      return this.http.patch<ApiResourceResponse<Project>>(
        `${this.apiUrl}/${id}/archive`,
        {}
      );
    }

  activateProject(
      id: number
    ): Observable<ApiResourceResponse<Project>> {
      return this.http.patch<ApiResourceResponse<Project>>(
        `${this.apiUrl}/${id}/activate`,
        {}
      );
    }
}
