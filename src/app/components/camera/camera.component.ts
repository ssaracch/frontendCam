import { Component, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-camera',
  standalone: false,
  templateUrl: './camera.component.html',
  styleUrl: './camera.component.css'
})
export class CameraComponent {

  @ViewChild('videoElement') videoElement!: ElementRef;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  isCameraOn = false;
  stream: MediaStream | null = null;

  predictionResult: string | null = null;
  confidence: string | null = null;

  // Store history of predictions
  predictionHistory: { image: string, label: string, confidence: string }[] = [];

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      this.videoElement.nativeElement.srcObject = this.stream;
      this.isCameraOn = true;
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access the camera');
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.videoElement.nativeElement.srcObject = null;
      this.isCameraOn = false;
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  Captureframe() {
    const video = this.videoElement.nativeElement as HTMLVideoElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Canvas context not available');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg');
    this.sendToBackend(imageData);
  }

  sendToBackend(imageBase64: string) {
    const payload = { image: imageBase64 };

    fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(response => response.json())
      .then(data => {
        const label = data.prediction === 1 ? 'Clear' : 'Not Clear';
        const conf = (data.probability[data.prediction] * 100).toFixed(2);
        this.predictionResult = label;
        this.confidence = conf ;

        // Add new result to history table
        this.predictionHistory.unshift({
          image: imageBase64,
          label: this.predictionResult,
          confidence: this.confidence
        });
      })
      .catch(error => {
        console.error('Error contacting backend:', error);
        alert('Failed to get prediction from backend.');
      });
  }
}
