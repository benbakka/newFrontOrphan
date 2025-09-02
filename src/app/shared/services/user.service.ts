import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, CreateUserRequest, UpdateUserRequest, Permission, UserListDTO } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/api/auth`;

  constructor(private http: HttpClient) {}

  private getHttpOptions() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      })
    };
  }

  // Get all users
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`, this.getHttpOptions());
  }

  // Get user by ID
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`, this.getHttpOptions());
  }

  // Create new user
  createUser(user: CreateUserRequest): Observable<any> {
    console.log('Creating user with data:', user);
    return this.http.post(`${this.apiUrl}/register`, user, this.getHttpOptions());
  }

  // Update user
  updateUser(id: number, user: UpdateUserRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${id}`, user, this.getHttpOptions());
  }

  // Delete user
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`, this.getHttpOptions());
  }

  // Get user permissions
  getUserPermissions(userId: number): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/users/${userId}/permissions`, this.getHttpOptions());
  }

  // Update user permissions
  updateUserPermissions(userId: number, permissions: Permission[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}/permissions`, permissions, this.getHttpOptions());
  }

  // Check if username exists
  checkUsernameExists(username: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-username/${username}`, this.getHttpOptions());
  }

  // Check if email exists
  checkEmailExists(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-email/${email}`, this.getHttpOptions());
  }
}
