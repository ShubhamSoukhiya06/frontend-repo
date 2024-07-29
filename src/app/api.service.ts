import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface CheckImageQualityResponse {
  result: string;
}

@Injectable({
  providedIn: 'root'
}) 
export class ApiService {
  private readonly apiUrl = 'http://localhost:8080/checkImageQuality';

  constructor(private http: HttpClient) {}

  uploadBatch(formData: FormData): Observable<HttpResponse<CheckImageQualityResponse>> {
    const headers = new HttpHeaders({ 'Accept': 'application/json' });
    return this.http.post<CheckImageQualityResponse>(this.apiUrl, formData, {
      reportProgress: true,
      observe: 'response',
      headers: headers
    }).pipe(
      catchError(error => {
        console.error('Batch Upload failed!', error);
        throw error;
      })
    );
  }
}
