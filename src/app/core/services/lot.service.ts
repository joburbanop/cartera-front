import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, ApiResourceResponse } from '../models/api-response';
import { Lot } from '../models/lot.model';

@Injectable({
  providedIn: 'root'
})
export class LotService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/lots`;

  getLots(projectId?: number): Observable<ApiListResponse<Lot>> {
    const params: Record<string, string | number> = {};

    if (projectId) {
      params['project_id'] = projectId;
    }

    return this.http.get<ApiListResponse<Lot>>(this.apiUrl, { params });
  }

  getLotsByProject(projectId: number): Observable<ApiListResponse<Lot>> {
    return this.getLots(projectId);
  }

  createLot(data: Partial<Lot> | Record<string, unknown>): Observable<ApiResourceResponse<Lot>> {
    return this.http.post<ApiResourceResponse<Lot>>(this.apiUrl, data);
  }

  getAllLots(): Observable<ApiListResponse<Lot>> {
    return this.getLots();
  }
}
