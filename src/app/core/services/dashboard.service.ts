import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dashboard`;

  getCarteraEnMora(): Observable<any> {
    return this.http.get(`${this.apiUrl}/cartera-mora`);
  }

  getRecaudoReciente(): Observable<any> {
    return this.http.get(`${this.apiUrl}/recaudo-reciente`);
  }

  getProximosVencimientos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/proximos-vencimientos`);
  }

  getActividadReciente(): Observable<any> {
    return this.http.get(`${this.apiUrl}/actividad-reciente`);
  }
}
