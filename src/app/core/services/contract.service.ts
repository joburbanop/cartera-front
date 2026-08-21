import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/contracts';

  // US-12: Enviar los datos del formulario para crear el contrato y simular el plan v1
  createContract(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  // Obtener listado de contratos (historial)
  getContracts(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  // Consultar la ficha financiera de un contrato específico (con su plan de amortización)
  getContractById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }
}