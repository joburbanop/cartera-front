import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SearchClientHit {
  id: number;
  name: string;
  document_number: string;
}

export interface SearchContractHit {
  id: number;
  contract_number: string;
  customer_name: string | null;
}

export interface SearchLotHit {
  id: number;
  number: string;
  project_name: string | null;
  project_id: number | null;
}

export interface SearchResults {
  clients: SearchClientHit[];
  contracts: SearchContractHit[];
  lots: SearchLotHit[];
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  search(query: string): Observable<SearchResults> {
    return this.http.get(`${this.apiUrl}/search`, { params: { q: query } }).pipe(
      map((response: any) => {
        const payload = response?.data ?? response ?? {};
        return {
          clients: Array.isArray(payload.clients) ? payload.clients : [],
          contracts: Array.isArray(payload.contracts) ? payload.contracts : [],
          lots: Array.isArray(payload.lots) ? payload.lots : [],
        };
      })
    );
  }
}
