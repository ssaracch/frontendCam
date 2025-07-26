// FIXED global-camera.service.ts - Fix TypeScript error handling
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AlertsHistoryService } from './alert-history.service';
import { CameraService } from './camera.service';

export interface CameraStatus {
  isActive: boolean;
  currentStatus: 'normal' | 'blurry' | 'offline';
  lastPrediction: string | null;
  confidence: string | null;
  lastUpdate: Date;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalCameraService {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private monitoringInterval: any;
  private statusCheckInterval: any;

  // Camera configuration
  private readonly CAMERA_ID = 1;
  private readonly USER_ID = parseInt(localStorage.getItem('userId') || '1');
  private readonly MONITORING_INTERVAL = 10000; // 10 seconds
  private readonly STATUS_CHECK_INTERVAL = 30000; // 30 seconds - less frequent

  // Status tracking
  private cameraStatusSubject = new BehaviorSubject<CameraStatus>({
    isActive: false,
    currentStatus: 'offline',
    lastPrediction: null,
    confidence: null,
    lastUpdate: new Date()
  });

  public cameraStatus$ = this.cameraStatusSubject.asObservable();

  constructor(
    private alertsHistoryService: AlertsHistoryService,
    private cameraService: CameraService
  ) {
    console.log('🔧 GlobalCameraService constructor');
    // Initialize status checking but less frequently
    this.startStatusReporting();
  }

  // Get current camera status
  getCurrentStatus(): CameraStatus {
    return this.cameraStatusSubject.value;
  }

  // Start camera globally
  async startCamera(videoElement?: HTMLVideoElement, canvasElement?: HTMLCanvasElement): Promise<boolean> {
    try {
      console.log('🎬 Starting camera globally...');

      // Register elements first if provided
      if (videoElement && canvasElement) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        console.log('📝 Elements registered during start');
      }

      // If camera is already running, just connect to new elements
      if (this.stream && this.stream.active) {
        console.log('📹 Camera stream already exists, connecting to elements');
        if (this.videoElement) {
          this.videoElement.srcObject = this.stream;
        }
        
        // Make sure auto monitoring is running
        if (!this.monitoringInterval) {
          this.startAutoMonitoring();
        }
        
        return true;
      }

      // Validate elements are available
      if (!this.videoElement || !this.canvasElement) {
        console.error('❌ Video or canvas elements not available for camera start');
        return false;
      }

      // Start new camera stream
      console.log('📹 Requesting new camera stream...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        },
        audio: false
      });

      // Connect stream to video element
      this.videoElement.srcObject = this.stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        if (!this.videoElement) {
          reject(new Error('Video element lost'));
          return;
        }

        const onLoadedMetadata = () => {
          console.log(`📊 Video loaded: ${this.videoElement!.videoWidth}x${this.videoElement!.videoHeight}`);
          resolve();
        };

        const onError = (error: any) => {
          console.error('❌ Video loading error:', error);
          reject(error);
        };

        this.videoElement.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        this.videoElement.addEventListener('error', onError, { once: true });

        // Timeout fallback
        setTimeout(() => {
          if (this.videoElement && this.videoElement.videoWidth > 0) {
            resolve();
          } else {
            reject(new Error('Video failed to load within timeout'));
          }
        }, 5000);
      });

      // FIXED: Update status to normal IMMEDIATELY when camera starts
      this.updateStatus({
        isActive: true,
        currentStatus: 'normal',
        lastUpdate: new Date()
      });

      console.log('✅ Camera started successfully - Status set to NORMAL');

      // Update backend IMMEDIATELY with normal status
      this.updateBackendStatus('normal');

      // Start monitoring AFTER camera is fully ready and status is set
      this.startAutoMonitoring();

      return true;
    } catch (error) {
      console.error('❌ Error starting camera:', this.getErrorMessage(error));
      this.updateStatus({
        isActive: false,
        currentStatus: 'offline',
        lastUpdate: new Date()
      });
      this.updateBackendStatus('offline');
      return false;
    }
  }

  // Stop camera globally
  stopCamera(): void {
    console.log('⏹️ Stopping camera globally...');
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log(`🔇 Stopped track: ${track.kind}`);
      });
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.stopAutoMonitoring();

    this.updateStatus({
      isActive: false,
      currentStatus: 'offline',
      lastUpdate: new Date()
    });

    this.updateBackendStatus('offline');
    console.log('✅ Camera stopped');
  }

  // Register video and canvas elements when navigating to camera page
  registerElements(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): void {
    console.log('📝 Registering elements with global service');
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;

    // If camera stream exists, connect it to the new video element
    if (this.stream && this.stream.active) {
      console.log('📹 Connecting existing stream to new video element');
      videoElement.srcObject = this.stream;
    }
  }

  // Manual capture (for the capture button)
  captureFrame(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.videoElement || !this.canvasElement) {
        reject(new Error('Video or canvas element not available'));
        return;
      }

      if (!this.getCurrentStatus().isActive) {
        reject(new Error('Camera is not active'));
        return;
      }

      this.captureAndAnalyze(true) // Pass true for manual capture
        .then(resolve)
        .catch(reject);
    });
  }

  // Start automatic monitoring - FIXED
  private startAutoMonitoring(): void {
    console.log('🔄 Starting auto monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Initial capture after a short delay to ensure camera is ready
    setTimeout(() => {
      if (this.getCurrentStatus().isActive) {
        console.log('🎬 Performing initial auto capture...');
        this.captureAndAnalyze(false).catch((error: unknown) => {
          console.error('❌ Initial auto monitoring error:', this.getErrorMessage(error));
          this.handleCameraError();
        });
      }
    }, 3000); // Increased delay

    this.monitoringInterval = setInterval(() => {
      if (this.getCurrentStatus().isActive && this.videoElement && this.canvasElement) {
        console.log('🔄 Auto monitoring capture...');
        this.captureAndAnalyze(false).catch((error: unknown) => {
          console.error('❌ Auto monitoring error:', this.getErrorMessage(error));
          this.handleCameraError();
        });
      } else {
        console.log('⚠️ Skipping auto monitoring - camera not ready');
      }
    }, this.MONITORING_INTERVAL);
  }

  // Stop automatic monitoring
  private stopAutoMonitoring(): void {
    console.log('⏹️ Stopping auto monitoring...');
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Start status reporting to backend
  private startStatusReporting(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }

    // FIXED: Less frequent status reporting to avoid spam
    this.statusCheckInterval = setInterval(() => {
      const status = this.getCurrentStatus();
      // Only report if camera is active
      if (status.isActive) {
        this.updateBackendStatus(status.currentStatus);
      }
    }, this.STATUS_CHECK_INTERVAL);
  }

  // Capture and analyze frame - FIXED
  private async captureAndAnalyze(isManualCapture: boolean = false): Promise<any> {
    if (!this.videoElement || !this.canvasElement) {
      throw new Error('Video or canvas element not available');
    }

    // Validate video is ready
    if (this.videoElement.readyState < 2) {
      throw new Error('Video not ready');
    }

    if (this.videoElement.videoWidth === 0 || this.videoElement.videoHeight === 0) {
      throw new Error('Invalid video dimensions');
    }

    const context = this.canvasElement.getContext('2d');
    if (!context) {
      throw new Error('Canvas context not available');
    }

    try {
      // Capture frame
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasElement.height = this.videoElement.videoHeight;
      context.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);

      const imageData = this.canvasElement.toDataURL('image/jpeg', 0.8);
      console.log(`📸 Frame captured: ${imageData.length} bytes`);

      // Send to ML backend
      console.log('🤖 Sending to ML backend...');
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });

      if (!response.ok) {
        throw new Error(`ML backend request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const label = data.prediction === 1 ? 'normal' : 'blurry';
      const confidence = (data.probability[data.prediction] * 100).toFixed(2);

      console.log(`🎯 ML Prediction: ${label} (${confidence}% confidence)`);

      // FIXED: Update local status ONLY after successful ML prediction
      this.updateStatus({
        isActive: true,
        currentStatus: label as 'normal' | 'blurry',
        lastPrediction: label,
        confidence: confidence,
        lastUpdate: new Date()
      });

      // Send to backend - FIXED: Always send predictions
      this.sendPredictionToBackend(data, imageData);

      return { label, confidence, data };

    } catch (error) {
      console.error('❌ Capture and analyze error:', this.getErrorMessage(error));
      
      // FIXED: Don't immediately set offline for ML errors
      const errorMessage = this.getErrorMessage(error);
      if (errorMessage.includes('ML backend')) {
        console.log('🔄 ML backend error, keeping camera active but noting error');
        // Keep camera active but update last prediction
        this.updateStatus({
          isActive: true,
          currentStatus: this.getCurrentStatus().currentStatus, // Keep current status
          lastPrediction: 'ML Error',
          confidence: '0',
          lastUpdate: new Date()
        });
      } else {
        // Only set offline for actual camera errors
        this.handleCameraError();
      }
      
      throw error;
    }
  }

  // Handle camera errors
  private handleCameraError(): void {
    console.log('🚨 Handling camera error - setting offline');
    this.updateStatus({
      isActive: false,
      currentStatus: 'offline',
      lastUpdate: new Date()
    });
    this.updateBackendStatus('offline');
    this.stopAutoMonitoring();
  }

  // Update local status
  private updateStatus(updates: Partial<CameraStatus>): void {
    const currentStatus = this.cameraStatusSubject.value;
    const newStatus = { ...currentStatus, ...updates };
    this.cameraStatusSubject.next(newStatus);
    console.log('📊 Status updated:', newStatus);
  }

  // Send prediction to backend - FIXED
  private sendPredictionToBackend(predictionData: any, imageBase64: string): void {
    const label = predictionData.prediction === 1 ? 'normal' : 'blurry';
    
    const payload = {
      cameraId: this.CAMERA_ID,
      prediction: predictionData.prediction,
      probability: predictionData.probability,
      image: imageBase64,
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending prediction to backend:', { 
      cameraId: payload.cameraId, 
      prediction: payload.prediction,
      confidence: (payload.probability[payload.prediction] * 100).toFixed(2) + '%',
      status: label
    });

    this.alertsHistoryService.sendAIPrediction(payload).subscribe({
      next: (response) => {
        console.log('✅ Prediction response from backend:', response);
        
        // FIXED: Don't override local status with backend response immediately
        // The local status should reflect the actual ML prediction
        // Backend may have different logic (confidence thresholds, etc.)
        
        if (response.success) {
          console.log(`📊 Backend processed prediction: ${response.previousStatus} -> ${response.newStatus}`);
          
          // Only log the backend response, don't override local status
          // Local status should reflect actual camera state
        }
      },
      error: (error: unknown) => {
        console.error('❌ Error sending prediction to backend:', this.getErrorMessage(error));
        // Don't set camera offline for backend communication errors
        console.log('🔄 Backend error, but keeping camera active');
      }
    });
  }

  // Update backend camera status - FIXED
  private updateBackendStatus(status: string): void {
    console.log(`📤 Updating backend status to: ${status}`);
    
    this.cameraService.updateCameraStatus(this.CAMERA_ID, status).subscribe({
      next: (response) => {
        console.log(`✅ Camera ${this.CAMERA_ID} backend status updated to: ${status}`);
      },
      error: (error: unknown) => {
        console.error('❌ Error updating camera backend status:', this.getErrorMessage(error));
        // Don't affect local camera operation for backend status update errors
      }
    });
  }

  // Helper method to safely extract error messages - FIXED
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as any).message);
    }
    return 'Unknown error occurred';
  }

  // Check if camera is currently active
  isCameraActive(): boolean {
    return this.getCurrentStatus().isActive;
  }

  // Get camera stream for components that need it
  getCameraStream(): MediaStream | null {
    return this.stream;
  }

  // Cleanup when app closes
  destroy(): void {
    this.stopCamera();
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}