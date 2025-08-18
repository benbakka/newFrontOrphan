import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CharityProject } from '../models/charity-project.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CharityProjectService {
  private apiUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) { }

  getProjects(): Observable<CharityProject[]> {
    return this.http.get<CharityProject[]>(`${this.apiUrl}/all`);
  }

  getProject(id: number): Observable<CharityProject> {
    return this.http.get<CharityProject>(`${this.apiUrl}/${id}`);
  }

  createProject(project: CharityProject): Observable<CharityProject> {
    return this.http.post<CharityProject>(this.apiUrl, project);
  }

  updateProject(project: CharityProject): Observable<CharityProject> {
    return this.http.put<CharityProject>(`${this.apiUrl}/${project.id}`, project);
  }

  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
