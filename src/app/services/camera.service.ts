import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Camera } from '../models/camera';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private apiUrl = 'http://localhost:9090/api/cameras';
  private aiCameraApiUrl = 'http://localhost:9090/api/ai-camera';

  constructor(private http: HttpClient) {}

  // ========== REGULAR CAMERA ENDPOINTS ==========
  getAllCameras(): Observable<Camera[]> {
    return this.http.get<Camera[]>(this.apiUrl).pipe(
      tap(cameras => console.log('📥 Regular cameras loaded:', cameras.length)),
      catchError(error => {
        console.error('❌ Error loading regular cameras:', error);
        return of([]);
      })
    );
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
    return this.http.get<{ [key: string]: number }>(`${this.apiUrl}/status-counts`).pipe(
      tap(counts => console.log('📊 Status counts:', counts)),
      catchError(error => {
        console.error('❌ Error loading status counts:', error);
        return of({});
      })
    );
  }

  getCameraStats(): Observable<{ total: number; online: number; offline: number }> {
    return this.http.get<{ total: number; online: number; offline: number }>(`${this.apiUrl}/stats`);
  }

  getOfflineOrBlurryCameras(): Observable<Camera[]> {
    return this.http.get<Camera[]>(`${this.apiUrl}/status/offline-or-blurry`);
  }

  // Simple status update (for regular camera management)
  updateCameraStatusSimple(cameraId: number, status: string): Observable<any> {
    const url = `${this.apiUrl}/${cameraId}/status`;
    console.log('📤 Simple status update:', { cameraId, status, url });
    return this.http.put(url, { statusCamera: status }).pipe(
      tap(response => console.log('✅ Simple status update success:', response)),
      catchError(error => {
        console.error('❌ Simple status update failed:', error);
        throw error;
      })
    );
  }

  // Alternative method using PATCH
  updateCameraStatusPatch(cameraId: number, status: string): Observable<any> {
    const url = `${this.apiUrl}/${cameraId}`;
    console.log('📤 PATCH status update:', { cameraId, status, url });
    return this.http.patch(url, { statusCamera: status }).pipe(
      tap(response => console.log('✅ PATCH status update success:', response)),
      catchError(error => {
        console.error('❌ PATCH status update failed:', error);
        throw error;
      })
    );
  }

  // Get single camera (regular endpoint)
  getCameraByIdRegular(id: number): Observable<Camera> {
    return this.http.get<Camera>(`${this.apiUrl}/${id}`);
  }

  // ========== AI CAMERA INTEGRATION ENDPOINTS ==========
  
  // ENHANCED: AI-integrated status update with fallback options
  updateCameraStatus(cameraId: number, status: string): Observable<any> {
    const payload = {
      cameraId: cameraId,
      newStatus: status,
      timestamp: new Date().toISOString(),
      source: 'MANUAL'
    };
    
    console.log('📤 AI Camera status update:', { 
      endpoint: `${this.aiCameraApiUrl}/status-update`,
      payload 
    });
    
    return this.http.post(`${this.aiCameraApiUrl}/status-update`, payload).pipe(
      tap(response => {
        console.log('✅ AI Camera status update success:', response);
      }),
      catchError(error => {
        console.error('❌ AI Camera status update failed:', error);
        console.log('🔄 Trying fallback methods...');
        
        // Try fallback method 1: Simple status update
        return this.updateCameraStatusSimple(cameraId, status).pipe(
          tap(response => {
            console.log('✅ Fallback simple status update worked:', response);
          }),
          catchError(fallbackError1 => {
            console.error('❌ Fallback simple status update also failed:', fallbackError1);
            
            // Try fallback method 2: PATCH status update
            return this.updateCameraStatusPatch(cameraId, status).pipe(
              tap(response => {
                console.log('✅ Fallback PATCH status update worked:', response);
              }),
              catchError(fallbackError2 => {
                console.error('❌ All status update methods failed!', fallbackError2);
                
                // Log comprehensive error information
                this.logStatusUpdateFailure(cameraId, status, error, fallbackError1, fallbackError2);
                
                // Return a mock success to prevent app crashes
                return of({ 
                  success: false, 
                  message: 'Status update failed but continuing...',
                  cameraId,
                  status 
                });
              })
            );
          })
        );
      })
    );
  }

  // Helper method to log comprehensive error information
  private logStatusUpdateFailure(cameraId: number, status: string, ...errors: any[]): void {
    console.error('🚨 COMPREHENSIVE STATUS UPDATE FAILURE:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('📍 Details:');
    console.error('  - Camera ID:', cameraId);
    console.error('  - Status:', status);
    console.error('  - AI API URL:', this.aiCameraApiUrl);
    console.error('  - Regular API URL:', this.apiUrl);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🔍 Attempted Endpoints:');
    console.error('  1. POST', `${this.aiCameraApiUrl}/status-update`);
    console.error('  2. PUT', `${this.apiUrl}/${cameraId}/status`);
    console.error('  3. PATCH', `${this.apiUrl}/${cameraId}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Errors:');
    errors.forEach((error, index) => {
      console.error(`  ${index + 1}.`, error.status, error.statusText, '-', error.message);
    });
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('💡 Possible Backend Issues:');
    console.error('  - Check if camera ID', cameraId, 'exists in database');
    console.error('  - Verify backend endpoints are implemented');
    console.error('  - Check backend server logs for detailed errors');
    console.error('  - Ensure proper CORS configuration');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  // Get cameras with AI integration (recommended for live monitoring)
  getAllCamerasWithAI(): Observable<Camera[]> {
    console.log('📥 Loading AI-integrated cameras...');
    return this.http.get<Camera[]>(`${this.aiCameraApiUrl}/cameras`).pipe(
      tap(cameras => {
        console.log('✅ AI cameras loaded:', {
          count: cameras.length,
          endpoint: `${this.aiCameraApiUrl}/cameras`
        });
        if (cameras.length > 0) {
          console.log('📝 Sample AI camera:', cameras[0]);
        }
      }),
      catchError(error => {
        console.error('❌ Error loading AI cameras:', error);
        console.log('🔄 Falling back to regular cameras...');
        
        // Fallback to regular cameras if AI endpoint fails
        return this.getAllCameras();
      })
    );
  }

  // Get camera by ID with AI integration
  getCameraById(id: number): Observable<Camera> {
    console.log('📥 Loading AI camera by ID:', id);
    return this.http.get<Camera>(`${this.aiCameraApiUrl}/cameras/${id}`).pipe(
      tap(camera => console.log('✅ AI camera loaded:', camera)),
      catchError(error => {
        console.error('❌ Error loading AI camera by ID:', error);
        console.log('🔄 Falling back to regular camera endpoint...');
        
        // Fallback to regular camera endpoint
        return this.getCameraByIdRegular(id);
      })
    );
  }

  // Send AI prediction to backend
  sendAIPrediction(predictionData: any): Observable<any> {
    console.log('📤 Sending AI prediction:', {
      cameraId: predictionData.cameraId,
      prediction: predictionData.prediction,
      timestamp: predictionData.timestamp
    });
    
    return this.http.post(`${this.aiCameraApiUrl}/prediction`, predictionData).pipe(
      tap(response => {
        console.log('✅ AI prediction sent successfully:', response);
      }),
      catchError(error => {
        console.error('❌ Error sending AI prediction:', error);
        throw error;
      })
    );
  }

  // NEW: Test connectivity to backend endpoints
  testConnectivity(): Observable<any> {
    console.log('🔍 Testing backend connectivity...');
    
    const tests = [
      { name: 'Regular API', url: this.apiUrl },
      { name: 'AI Camera API', url: `${this.aiCameraApiUrl}/cameras` },
      { name: 'Health Check', url: `${this.aiCameraApiUrl}/health` }
    ];
    
    tests.forEach(test => {
      this.http.get(test.url).subscribe({
        next: (response) => {
          console.log(`✅ ${test.name} connectivity: OK`, response);
        },
        error: (error) => {
          console.error(`❌ ${test.name} connectivity: FAILED`, error.status, error.message);
        }
      });
    });
    
    return of({ message: 'Connectivity tests initiated' });
  }

  // NEW: Debug method to check camera existence
  checkCameraExists(cameraId: number): Observable<boolean> {
    console.log('🔍 Checking if camera exists:', cameraId);
    
    return this.getCameraById(cameraId).pipe(
      tap(camera => {
        console.log('✅ Camera exists:', camera);
      }),
      // Map the camera object to true (exists)
      map(() => true),
      catchError(error => {
        if (error.status === 404) {
          console.error('❌ Camera does not exist:', cameraId);
        } else {
          console.error('❌ Error checking camera existence:', error);
        }
        return of(false);
      })
    );
  }
}