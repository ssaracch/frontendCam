import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CameraListComponent } from './components/camera-list/camera-list.component';
import { LayoutComponent } from './components/layout/layout.component';
import { AlertsComponent } from './components/alerts/alerts.component';
import { CameraComponent } from './components/camera/camera.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  

    {path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'camera-list', component: CameraListComponent },
      { path: 'alerts', component: AlertsComponent },
      { path: 'camera', component: CameraComponent },


    ]
  }


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
