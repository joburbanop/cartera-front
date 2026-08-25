import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LotService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/lots';

  getLots(projectId?: number): Observable<any> {
    const params: Record<string, string | number> = {};

    if (projectId) {
      params['project_id'] = projectId;
    }

    return this.http.get(this.apiUrl, { params });
  }

  getLotsByProject(projectId: number): Observable<any> {
    return this.getLots(projectId);
  }

  createLot(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getAllLots(): Observable<any> {
    return this.getLots();
  }
}