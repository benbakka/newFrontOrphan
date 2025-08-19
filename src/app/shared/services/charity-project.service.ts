import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CharityProject, CreateCharityProjectRequest, CharityProjectPage, ProjectStatus } from '../models/charity-project.model';

@Injectable({
  providedIn: 'root'
})
export class CharityProjectService {
  private apiUrl = '${environment.apiUrl}/api/projects';

  constructor(private http: HttpClient) { }

  getCharityProjects(
    page: number = 0,
    size: number = 10,
    sortBy: string = 'createdDate',
    sortDir: string = 'desc',
    name?: string,
    type?: string,
    status?: ProjectStatus
  ): Observable<CharityProjectPage> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    if (name) params = params.set('name', name);
    if (type) params = params.set('type', type);
    if (status) params = params.set('status', status);

    return this.http.get<CharityProjectPage>(this.apiUrl, { params });
  }

  getCharityProjectById(id: number): Observable<CharityProject> {
    return this.http.get<CharityProject>(`${this.apiUrl}/${id}`);
  }

  getActiveProjects(): Observable<CharityProject[]> {
    return this.http.get<CharityProject[]>(`${this.apiUrl}/active`);
  }

  getProjects(size: number = 1000): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?size=${size}`);
  }

  getAllProjectTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/types`);
  }

  createCharityProject(request: CreateCharityProjectRequest): Observable<CharityProject> {
    return this.http.post<CharityProject>(this.apiUrl, request);
  }

  updateCharityProject(id: number, request: CreateCharityProjectRequest): Observable<CharityProject> {
    return this.http.put<CharityProject>(`${this.apiUrl}/${id}`, request);
  }

  updateCollectedAmount(id: number, amount: number): Observable<CharityProject> {
    return this.http.put<CharityProject>(`${this.apiUrl}/${id}/collected-amount`, amount);
  }

  deleteCharityProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
