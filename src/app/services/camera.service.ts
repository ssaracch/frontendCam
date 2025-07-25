import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Camera } from '../models/camera';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private apiUrl = 'http://localhost:9090/api/cameras';

  constructor(private http: HttpClient) {}

  getAllCameras(): Observable<Camera[]> {
    return this.http.get<Camera[]>(this.apiUrl);
  }

  addCamera(camera: Camera): Observable<Camera> {
    return this.http.post<Camera>(this.apiUrl, camera);
  }

  updateCamera(id: number, camera: Camera): Observable<Camera> {
    return this.http.put<Camera>(`${this.apiUrl}/${id}`, camera);
  }

  deleteCamera(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getStatusCounts(): Observable<{ [key: string]: number }> {
    return this.http.get<{ [key: string]: number }>(`${this.apiUrl}/status-counts`);
  }

  getCameraStats(): Observable<{ total: number; online: number; offline: number }> {
    return this.http.get<{ total: number; online: number; offline: number }>(`${this.apiUrl}/stats`);
  }

    getOfflineOrBlurryCameras(): Observable<Camera[]> {
    return this.http.get<Camera[]>(`${this.apiUrl}/status/offline-or-blurry`);
  }
}