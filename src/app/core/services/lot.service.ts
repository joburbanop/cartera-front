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

  getLots(projectId?: number, page = 1, perPage = 20): Observable<ApiListResponse<Lot>> {
    const params: Record<string, string | number> = {
      page,
      per_page: perPage,
    };

    if (projectId) {
      params['project_id'] = projectId;
    }

    return this.http.get<ApiListResponse<Lot>>(this.apiUrl, { params });
  }

  getLotsByProject(projectId: number, page = 1, perPage = 20): Observable<ApiListResponse<Lot>> {
    return this.getLots(projectId, page, perPage);
  }

  getLot(id: number): Observable<ApiResourceResponse<Lot>> {
    return this.http.get<ApiResourceResponse<Lot>>(`${this.apiUrl}/${id}`);
  }

  createLot(data: Partial<Lot> | Record<string, unknown>): Observable<ApiResourceResponse<Lot>> {
    return this.http.post<ApiResourceResponse<Lot>>(this.apiUrl, data);
  }

  getAllLots(page = 1, perPage = 20): Observable<ApiListResponse<Lot>> {
    return this.getLots(undefined, page, perPage);
  }
}
