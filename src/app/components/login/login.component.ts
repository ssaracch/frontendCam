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
        console.log('Login response:', user);
      // Supposons que 'user' est l’objet utilisateur retourné par l’API
      // et contient l’id sous 'idUser' (ou adapte selon ta réponse réelle)
      
      if (user && user.id_User) {
        localStorage.setItem('userId', user.id_User.toString());
      }

      // Login réussi, redirection
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
