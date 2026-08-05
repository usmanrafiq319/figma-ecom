import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';

import { RouterOutlet } from '@angular/router';

import { Header } from './components/header/header';
import { NavBar } from './components/nav-bar/nav-bar';
import { Footer } from './components/footer/footer';
import { UserChat } from './components/user-chat/user-chat';

import { AuthService } from './services/auth-service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    Header,
    NavBar,
    Footer,
    UserChat
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  private readonly authService =
    inject(AuthService);

  /*
   * This computed value reacts whenever
   * AuthService.isloggedin changes.
   *
   * It also checks the actual role, so admins
   * do not see the user support chat.
   */
  readonly isUser = computed(() => {
    if (!this.authService.isloggedin()) {
      return false;
    }

    const role =
      this.authService
        .getUserRole()
        .trim()
        .toLowerCase();

    return role === 'user';
  });
}