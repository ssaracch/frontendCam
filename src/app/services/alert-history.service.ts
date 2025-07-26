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
  confidence?: number;
  source?: string;
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

// Interface for creating new alerts
export interface CreateAlertRequest {
  userId: number;
  cameraId: number;
  alertType: string;
  startTime: string;
  image?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertsHistoryService {
  private apiUrl = 'http://localhost:9090/api/alerts-history';
  private alertsApiUrl = 'http://localhost:9090/api/alerts';
  private aiCameraApiUrl = 'http://localhost:9090/api/ai-camera';

  constructor(private http: HttpClient) {}

  // ========== REGULAR ALERTS ENDPOINTS ==========
  
  // Get all alerts history
  getAlertsHistory(): Observable<AlertsHistory[]> {
    return this.http.get<AlertsHistory[]>(this.apiUrl);
  }

  // Get unified alerts data including current camera statuses
  getUnifiedAlerts(): Observable<UnifiedAlert[]> {
    return this.http.get<UnifiedAlert[]>(`${this.alertsApiUrl}/unified`);
  }

  // Delete alert history
  deleteHistory(id: AlertsHistoryId): Observable<void> {
    return this.http.delete<void>(this.apiUrl, { body: id });
  }

  // Get cameras (this might be redundant with CameraService)
  getCameras(): Observable<Camera[]> {
    return this.http.get<Camera[]>('http://localhost:9090/api/cameras');
  }

  // ========== AI CAMERA INTEGRATION ENDPOINTS ==========

  // Send AI prediction to backend (NEW - connects to AICameraController)
  sendAIPrediction(predictionData: any): Observable<any> {
    return this.http.post(`${this.aiCameraApiUrl}/prediction`, predictionData);
  }

  // Get camera history using AI endpoints (NEW)
  getCameraHistory(cameraId: number): Observable<AlertsHistory[]> {
    return this.http.get<AlertsHistory[]>(`${this.aiCameraApiUrl}/history/${cameraId}`);
  }

  // Get ongoing alerts for a camera (NEW)
  getOngoingAlerts(cameraId: number): Observable<AlertsHistory[]> {
    return this.http.get<AlertsHistory[]>(`${this.aiCameraApiUrl}/ongoing-alerts/${cameraId}`);
  }

  // ========== ALERT MANAGEMENT ==========

  // Updated createAlert method to work with your backend
  createAlert(alertData: CreateAlertRequest): Observable<any> {
    // Use the AI camera status update endpoint for manual alerts
    const payload = {
      cameraId: alertData.cameraId,
      newStatus: alertData.alertType,
      timestamp: alertData.startTime,
      source: 'MANUAL'
    };
    return this.http.post(`${this.aiCameraApiUrl}/status-update`, payload);
  }

  // Resolve an alert (mark as performed) - if you need manual resolution
  resolveAlert(alertId: number): Observable<any> {
    const url = `${this.alertsApiUrl}/${alertId}/resolve`;
    return this.http.put(url, { 
      performed_at: new Date().toISOString() 
    });
  }

  // Create alert with simplified parameters
  createAlertSimple(userId: number, cameraId: number, alertType: string): Observable<any> {
    const alertData: CreateAlertRequest = {
      userId: userId,
      cameraId: cameraId,
      alertType: alertType,
      startTime: new Date().toISOString()
    };
    
    return this.createAlert(alertData);
  }


  forceRefreshData(): void {
  // This method can be called by other components to force data refresh
  // You can implement this as a subject that other components subscribe to
}


  // Check for status changes and create history entries automatically
checkStatusChangeAndCreateHistory(cameraId: number, oldStatus: string, newStatus: string): Observable<any> {
  const payload = {
    cameraId: cameraId,
    oldStatus: oldStatus,
    newStatus: newStatus,
    timestamp: new Date().toISOString()
  };
  return this.http.post(`${this.aiCameraApiUrl}/status-change`, payload);
}

// Get real-time camera statuses
getRealTimeCameraStatuses(): Observable<Camera[]> {
  return this.http.get<Camera[]>(`${this.aiCameraApiUrl}/real-time-status`);
}
}