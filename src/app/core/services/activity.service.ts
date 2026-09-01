import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResourceResponse } from '../models/api-response';
import { ActivityEntry, ActivitySubjectType } from '../models/activity-entry.model';

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/activity`;

  getActivity(subjectType: ActivitySubjectType, subjectId: number): Observable<ApiResourceResponse<ActivityEntry[]>> {
    const params = new HttpParams()
      .set('subject_type', subjectType)
      .set('subject_id', String(subjectId));

    return this.http.get<ApiResourceResponse<ActivityEntry[]>>(this.apiUrl, { params });
  }
}
