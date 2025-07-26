// FIXED camera.component.ts
import { Component, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { GlobalCameraService, CameraStatus } from '../../services/global-camera.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-camera',
  standalone: false,
  templateUrl: './camera.component.html',
  styleUrl: './camera.component.css'
})
export class CameraComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  // Camera status from global service
  cameraStatus: CameraStatus = {
    isActive: false,
    currentStatus: 'offline',
    lastPrediction: null,
    confidence: null,
    lastUpdate: new Date()
  };

  // Store history of predictions for display
  predictionHistory: { image: string, label: string, confidence: string, timestamp: Date }[] = [];

  private statusSubscription: Subscription = new Subscription();
  private elementsRegistered = false;
  private elementRegistrationAttempts = 0;
  private maxRegistrationAttempts = 5;

  // Loading states
  isStartingCamera = false;
  isCapturing = false;
  errorMessage: string | null = null;

  constructor(
    private globalCameraService: GlobalCameraService,
    private cdr: ChangeDetectorRef
  ) {
    console.log('🔧 CameraComponent constructor called');
  }

  ngOnInit() {
    console.log('🔧 CameraComponent ngOnInit called');
    
    // Subscribe to global camera status
    this.statusSubscription = this.globalCameraService.cameraStatus$.subscribe(status => {
      console.log('📊 Camera status updated in component:', status);
      this.cameraStatus = status;
      this.errorMessage = null; // Clear error when status updates
      this.cdr.detectChanges(); // Force change detection
    });

    // Get initial status
    this.cameraStatus = this.globalCameraService.getCurrentStatus();
    console.log('📊 Initial camera status:', this.cameraStatus);
  }

  ngAfterViewInit() {
    console.log('🔧 CameraComponent ngAfterViewInit called');
    
    // Register elements with multiple attempts and progressive delays
    this.attemptElementRegistration();
  }

  private attemptElementRegistration(): void {
    const attempt = () => {
      this.elementRegistrationAttempts++;
      console.log(`📝 Registration attempt ${this.elementRegistrationAttempts}/${this.maxRegistrationAttempts}`);
      
      if (this.registerElements()) {
        console.log('✅ Elements registered successfully');
        return;
      }

      // If not successful and we haven't reached max attempts, try again
      if (this.elementRegistrationAttempts < this.maxRegistrationAttempts) {
        const delay = this.elementRegistrationAttempts * 200; // Progressive delay
        console.log(`⏳ Retrying registration in ${delay}ms...`);
        setTimeout(attempt, delay);
      } else {
        console.error('❌ Failed to register elements after maximum attempts');
        this.errorMessage = 'Impossible d\'initialiser les éléments caméra. Rechargez la page.';
        this.cdr.detectChanges();
      }
    };

    // Start first attempt after a small delay
    setTimeout(attempt, 100);
  }

  private registerElements(): boolean {
    if (this.elementsRegistered) {
      return true; // Already registered
    }
    
    console.log('📝 Attempting to register video and canvas elements...');
    
    // Check if ViewChild elements are available
    if (!this.videoElement || !this.canvasElement) {
      console.log('⚠️ ViewChild references not available yet');
      return false;
    }

    // Check if native elements exist
    const videoEl = this.videoElement.nativeElement;
    const canvasEl = this.canvasElement.nativeElement;
    
    if (!videoEl || !canvasEl) {
      console.log('⚠️ Native elements not available yet');
      return false;
    }

    // Validate elements are properly initialized
    if (!(videoEl instanceof HTMLVideoElement) || !(canvasEl instanceof HTMLCanvasElement)) {
      console.log('⚠️ Elements are not of correct type');
      return false;
    }

    console.log('✅ Elements found, registering with global service');
    
    try {
      this.globalCameraService.registerElements(videoEl, canvasEl);
      this.elementsRegistered = true;
      console.log('✅ Elements registered successfully');
      
      // If camera is already running, connect the stream
      const stream = this.globalCameraService.getCameraStream();
      if (stream && stream.active) {
        console.log('📹 Camera stream already active, connecting to video element');
        videoEl.srcObject = stream;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error registering elements:', error);
      return false;
    }
  }

  ngOnDestroy() {
    console.log('🧹 CameraComponent ngOnDestroy called');
    
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
    // Don't stop camera here - let it run globally
  }

  async startCamera() {
    if (this.isStartingCamera) {
      console.log('⚠️ Camera start already in progress');
      return;
    }

    console.log('▶️ Starting camera...');
    this.isStartingCamera = true;
    this.errorMessage = null;
    
    try {
      // Make sure elements are registered first
      if (!this.elementsRegistered) {
        console.log('⚠️ Elements not registered yet, attempting registration...');
        
        // Force immediate registration attempt
        if (!this.registerElements()) {
          // Wait a bit and try again
          await new Promise(resolve => setTimeout(resolve, 500));
          
          if (!this.registerElements()) {
            throw new Error('Impossible d\'initialiser les éléments caméra. Vérifiez que la page est complètement chargée.');
          }
        }
      }

      // Validate elements before starting
      if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
        throw new Error('Éléments vidéo non disponibles');
      }

      console.log('📹 Starting camera with registered elements');

      const success = await this.globalCameraService.startCamera(
        this.videoElement.nativeElement,
        this.canvasElement.nativeElement
      );

      if (!success) {
        throw new Error('Impossible d\'accéder à la caméra. Vérifiez les permissions et que votre caméra n\'est pas utilisée par une autre application.');
      }

      console.log('✅ Camera started successfully - Auto monitoring should begin');
      this.errorMessage = null;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors du démarrage de la caméra';
      console.error('❌ Failed to start camera:', errorMessage);
      this.errorMessage = errorMessage;
      this.cdr.detectChanges();
    } finally {
      this.isStartingCamera = false;
      this.cdr.detectChanges();
    }
  }

  stopCamera() {
    console.log('⏹️ Stopping camera...');
    this.globalCameraService.stopCamera();
    this.errorMessage = null;
    this.predictionHistory = []; // Clear history when stopping
  }

  async captureFrame() {
    if (this.isCapturing) {
      console.log('⚠️ Capture already in progress');
      return;
    }

    console.log('📸 Manual capture frame requested...');
    this.isCapturing = true;
    this.errorMessage = null;
    
    try {
      // Comprehensive pre-capture validation
      const validationError = this.validateCaptureReadiness();
      if (validationError) {
        throw new Error(validationError);
      }

      console.log('📸 Performing manual capture...');
      const result = await this.globalCameraService.captureFrame();
      console.log('✅ Manual capture successful:', result);
      
      // Create image from canvas for display
      const canvas = this.canvasElement.nativeElement;
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Add to local display history
      this.predictionHistory.unshift({
        image: imageData,
        label: result.label === 'normal' ? 'Clear' : 'Not Clear',
        confidence: result.confidence,
        timestamp: new Date()
      });

      // Keep only last 10 results for display
      if (this.predictionHistory.length > 10) {
        this.predictionHistory = this.predictionHistory.slice(0, 10);
      }

      console.log('✅ Manual capture added to history. Total history:', this.predictionHistory.length);
      this.errorMessage = null;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de la capture';
      console.error('❌ Error capturing frame:', errorMessage);
      this.errorMessage = `Erreur de capture: ${errorMessage}`;
      
      // Debug information in console only
      this.debugCameraState();
    } finally {
      this.isCapturing = false;
      this.cdr.detectChanges();
    }
  }

  private validateCaptureReadiness(): string | null {
    // Check if camera is active
    if (!this.cameraStatus.isActive) {
      return 'La caméra n\'est pas active. Démarrez d\'abord la caméra.';
    }

    // Validate elements
    if (!this.videoElement?.nativeElement) {
      return 'Élément vidéo non disponible';
    }
    
    if (!this.canvasElement?.nativeElement) {
      return 'Élément canvas non disponible';
    }

    // Check if video is playing and ready
    const video = this.videoElement.nativeElement;
    if (video.readyState < 2) {
      return 'La vidéo n\'est pas prête. Attendez que la caméra se charge complètement.';
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return 'Dimensions vidéo invalides. Vérifiez la connexion caméra.';
    }

    // Additional checks
    if (video.paused || video.ended) {
      return 'La vidéo n\'est pas en cours de lecture.';
    }

    return null; // All good
  }

  // Debug method to check camera state
  private debugCameraState(): void {
    console.group('🐛 DEBUG - Camera Component State');
    console.log('- Elements registered:', this.elementsRegistered);
    console.log('- Registration attempts:', this.elementRegistrationAttempts);
    console.log('- Video element:', !!this.videoElement?.nativeElement);
    console.log('- Canvas element:', !!this.canvasElement?.nativeElement);
    console.log('- Camera status:', this.cameraStatus);
    console.log('- Global camera stream:', this.globalCameraService.getCameraStream());
    console.log('- Is starting camera:', this.isStartingCamera);
    console.log('- Is capturing:', this.isCapturing);
    
    if (this.videoElement?.nativeElement) {
      const video = this.videoElement.nativeElement;
      console.log('- Video details:', {
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused,
        ended: video.ended,
        srcObject: !!video.srcObject,
        currentTime: video.currentTime
      });
    }
    console.groupEnd();
  }

  // Getters for template
  get isCameraOn(): boolean {
    return this.cameraStatus.isActive;
  }

  get predictionResult(): string | null {
    return this.cameraStatus.lastPrediction;
  }

  get confidence(): string | null {
    return this.cameraStatus.confidence;
  }

  getCurrentStatus(): string {
    return this.cameraStatus.currentStatus;
  }

  getStatusColorClass(): string {
    switch (this.cameraStatus.currentStatus) {
      case 'normal': return 'status-normal';
      case 'offline': return 'status-offline';
      case 'blurry': return 'status-blurry';
      default: return 'status-unknown';
    }
  }

  getLastUpdateTime(): string {
    return this.cameraStatus.lastUpdate.toLocaleTimeString();
  }

  // Get status display text
  getStatusDisplayText(): string {
    const status = this.cameraStatus.currentStatus;
    switch (status) {
      case 'normal': return 'NORMAL';
      case 'offline': return 'HORS LIGNE';
      case 'blurry': return 'FLOU';
      default: return 'INCONNU';
    }
  }

  // Force refresh elements registration (for troubleshooting)
  forceRefreshElements(): void {
    console.log('🔄 Force refreshing elements registration...');
    this.elementsRegistered = false;
    this.elementRegistrationAttempts = 0;
    this.errorMessage = null;
    this.attemptElementRegistration();
  }

  // Clear error message
  clearError(): void {
    this.errorMessage = null;
  }

  // Clear prediction history
  clearHistory(): void {
    this.predictionHistory = [];
    console.log('🗑️ Prediction history cleared');
  }

  // Get formatted confidence with color class
  getConfidenceClass(): string {
    if (!this.confidence) return '';
    const conf = parseFloat(this.confidence);
    if (conf >= 90) return 'confidence-high';
    if (conf >= 70) return 'confidence-medium';
    return 'confidence-low';
  }

  // Check if capture button should be disabled
  get isCaptureDisabled(): boolean {
    return !this.isCameraOn || this.isCapturing || this.isStartingCamera;
  }

  // Check if start button should be disabled
  get isStartDisabled(): boolean {
    return this.isCameraOn || this.isStartingCamera;
  }
}