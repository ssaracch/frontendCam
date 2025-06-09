import { Component, OnInit } from '@angular/core';
import { ApexChart, ApexNonAxisChartSeries, ApexResponsive, ChartType } from 'ng-apexcharts';
import { CameraService } from '../../services/camera.service';
import { AlertsHistory, AlertsHistoryService } from '../../services/alert-history.service';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  totalCameras: number = 0;
  activeCameras: number = 0;
  offlineCameras: number = 0;
  blurryCameras: number = 0;

  show: boolean = false;

  cameraStatus!: {
    series: ApexNonAxisChartSeries;
    chart: ApexChart;
    labels: string[];
    colors: string[];
    responsive: ApexResponsive[];
  };

  alertHistory: AlertsHistory[] = [];

  constructor(
    private cameraService: CameraService,
    private alertsHistoryService: AlertsHistoryService
  ) {}

  ngOnInit(): void {
    this.fetchStatusCounts();
    this.fetchAlertHistory(); // Load alerts when dashboard initializes
  }

  fetchStatusCounts(): void {
    this.cameraService.getStatusCounts().subscribe(data => {
      this.activeCameras = data['normal'] || 0;
      this.offlineCameras = data['offline'] || 0;
      this.blurryCameras = data['blurry'] || 0;

      this.totalCameras = this.activeCameras + this.offlineCameras + this.blurryCameras;

      this.cameraStatus = {
        series: [this.activeCameras, this.offlineCameras, this.blurryCameras],
        chart: {
          type: 'donut' as ChartType,
          height: 250
        },
        labels: ['Active Cameras', 'Offline Cameras', 'Blurry Cameras'],
        colors: ['#28a745', '#dc3545', '#ffc107'], // green, red, yellow
        responsive: [{
          breakpoint: 480,
          options: {
            chart: {
              width: 200
            },
            legend: {
              position: 'bottom'
            }
          }
        }]
      };
    });
  }

  fetchAlertHistory(): void {
    this.alertsHistoryService.getAlertsHistory().subscribe(data => {
      this.alertHistory = data;
    });
  }

  toggle(): void {
    this.show = !this.show;
  }
}
