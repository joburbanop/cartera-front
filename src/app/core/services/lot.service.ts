import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LotService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/lots';

  // Obtenemos los lotes filtrados por proyecto
  getLotsByProject(projectId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}?project_id=${projectId}`);
  }

  createLot(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }
  // Obtener todos los lotes sin filtro de proyecto (Para el KPI general)
  getAllLots(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

}