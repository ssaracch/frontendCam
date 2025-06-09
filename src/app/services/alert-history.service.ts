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

@Injectable({
  providedIn: 'root'
})
export class AlertsHistoryService {
  private apiUrl = 'http://localhost:9090/api/alerts-history';

  constructor(private http: HttpClient) {}

  getAlertsHistory(): Observable<AlertsHistory[]> {
    return this.http.get<AlertsHistory[]>(this.apiUrl);
  }

  deleteHistory(id: AlertsHistoryId): Observable<void> {
    return this.http.delete<void>(this.apiUrl, { body: id });
  }
}
