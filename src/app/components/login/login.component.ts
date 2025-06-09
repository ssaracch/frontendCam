import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  show: boolean = false;

  constructor(private http: HttpClient, private router: Router, private userService: UserService) {}

  onLogin() {
    this.userService.login(this.username, this.password).subscribe({
      next: (user) => {
        // Login réussi
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        alert('Invalid credentials');
      }
    });
  }

  showPassword() {
    this.show = !this.show;
  }
}
