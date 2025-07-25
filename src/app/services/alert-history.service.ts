import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Camera } from '../models/camera';

export interface User {
  id_User: number;
  nom_User: string;
}

export interface Alert {
  id_Alert: number;
  type: string;
}

export interface AlertsHistory {
  user: User;
  camera: Camera;
  alert: Alert;
  start_alert: string;
  performed_at: string;
}

export interface AlertsHistoryId {
  userId: number;
  cameraId: number;
  alertId: number;
}

// New interface for unified alerts data
export interface UnifiedAlert {
  id_User: number;
  idCamera: number;
  location: string;
  type: string;
  start_alert: string | null;
  performed_at: string | null;
  isOngoing: boolean;
  isResolved: boolean;
  source: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertsHistoryService {
  private apiUrl = 'http://localhost:9090/api/alerts-history';
  private alertsApiUrl = 'http://localhost:9090/api/alerts'; // NEW: Correct endpoint

  constructor(private http: HttpClient) {}

  // OLD method - keep for backward compatibility if needed
  getAlertsHistory(): Observable<AlertsHistory[]> {
    return this.http.get<AlertsHistory[]>(this.apiUrl);
  }

  // NEW method - gets unified data including current camera statuses
  getUnifiedAlerts(): Observable<UnifiedAlert[]> {
    return this.http.get<UnifiedAlert[]>(`${this.alertsApiUrl}/unified`);
  }

  deleteHistory(id: AlertsHistoryId): Observable<void> {
    return this.http.delete<void>(this.apiUrl, { body: id });
  }

  getCameras(): Observable<Camera[]> {
    return this.http.get<Camera[]>('http://localhost:9090/api/cameras');
  }
}