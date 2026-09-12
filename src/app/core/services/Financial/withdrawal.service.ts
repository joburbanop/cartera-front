import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiResourceResponse } from '../../models/api-response';
import { Withdrawal } from '../../models/withdrawal.model';

export interface CreateWithdrawalRequest {
  contract_id: number;
  request_date: string;
  cause: 'retracto_de_ley' | 'fuerza_mayor' | 'voluntario';
  retention_percentage?: number | null;
  observations?: string | null;
  modification_justification?: string | null;
}

export interface WithdrawalCalculation {
  type: 'preventa';
  cause: 'retracto_de_ley' | 'fuerza_mayor' | 'voluntario';
  sale_price: number;
  contributions: number;
  standard_retention_percentage: number;
  authorized_retention_percentage: number;
  penalty_amount: number;
  refund_balance: number;
}

@Injectable({
  providedIn: 'root',
})
export class WithdrawalService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/withdrawals`;

  calculatePreventa(
    data: CreateWithdrawalRequest,
  ): Observable<ApiResourceResponse<WithdrawalCalculation>> {
    return this.http.post<ApiResourceResponse<WithdrawalCalculation>>(
      `${this.apiUrl}/preventa/calculate`,
      data,
    );
  }

  createPreventa(
    data: CreateWithdrawalRequest,
  ): Observable<ApiResourceResponse<Withdrawal>> {
    return this.http.post<ApiResourceResponse<Withdrawal>>(
      `${this.apiUrl}/preventa`,
      data,
    );
  }
}