import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CameraListComponent } from './components/camera-list/camera-list.component';
import { AlertsComponent } from './components/alerts/alerts.component';
import { LayoutComponent } from './components/layout/layout.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CameraComponent } from './components/camera/camera.component';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    CameraListComponent,
    AlertsComponent,
    LayoutComponent,
    CameraComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    NgApexchartsModule,
    NgbModule,
    ReactiveFormsModule,
    HttpClientModule  

],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
