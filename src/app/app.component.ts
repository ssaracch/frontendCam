import { Component } from '@angular/core';
import { GlobalCameraService } from './services/global-camera.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'camproject';

   constructor(private globalCameraService: GlobalCameraService) {}

  ngOnDestroy() {
    // Clean up global camera service when app closes
    this.globalCameraService.destroy();
  }
}
