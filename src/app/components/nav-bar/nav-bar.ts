import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { ChatSignalrService } from '../../services/chat-signalr-service';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss',
})
export class NavBar {
  service = inject(AuthService);
  signalrService =inject(ChatSignalrService)
  userlogedin = this.service.isloggedin;
  isDropdownOpen: boolean = false;

  // Simple helper to check if current logged-in user is an Admin
  isAdmin(): boolean {
    return this.service.getUserRole() === 'Admin';
  }

  logout(): void {
    if(this.userlogedin()){
      this.signalrService.stopConnection();
      this.service.logOut();
    }
    return
  }
}