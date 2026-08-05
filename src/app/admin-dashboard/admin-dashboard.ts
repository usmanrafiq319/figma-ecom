import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { RouterLink } from '@angular/router';

import {
  Subscription
} from 'rxjs';

import {
  ChatSignalrService
} from '../services/chat-signalr-service';

import {
  ChatApiService
} from '../services/chat-api-service';
import { ChatConnectionStatus } from '../models/chat.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    RouterLink
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class AdminDashboard
  implements OnInit, OnDestroy {

  unreadMessages = 0;

  unreadConversations = 0;

  loading = true;

  summaryError = false;

  connectionStatus:
    ChatConnectionStatus =
      'disconnected';

  private readonly subscriptions =
    new Subscription();

  constructor(
    private readonly chatApi:
      ChatApiService,

    private readonly chatSignalr:
      ChatSignalrService,

    private readonly changeDetector:
      ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    /*
     * Subscribe before starting SignalR so that
     * early events are not missed.
     */
    this.subscribeToChatEvents();

    /*
     * Load the initial notification summary
     * using the REST API.
     */
    this.loadSummary();

    try {
      await this.chatSignalr
        .startConnection();

      console.log(
        '[Admin dashboard] SignalR connected'
      );
    } catch (error) {
      console.error(
        '[Admin dashboard] Could not connect to chat:',
        error
      );

      /*
       * The connectionStatus$ subscription will
       * automatically update the UI to offline.
       */
    }
  }

  loadSummary(): void {
    this.loading = true;
    this.summaryError = false;

    const summarySubscription =
      this.chatApi
        .getAdminSummary()
        .subscribe({
          next: summary => {
            this.unreadMessages =
              summary.unreadMessages;

            this.unreadConversations =
              summary.unreadConversations;

            this.loading = false;
            this.summaryError = false;

            this.changeDetector
              .markForCheck();
          },

          error: error => {
            this.loading = false;
            this.summaryError = true;

            console.error(
              '[Admin dashboard] Could not load chat summary:',
              error
            );

            this.changeDetector
              .markForCheck();
          }
        });

    this.subscriptions.add(
      summarySubscription
    );
  }

  retryConnection(): void {
    void this.connectSignalr();
  }

  retrySummary(): void {
    this.loadSummary();
  }

  get isConnected(): boolean {
    return (
      this.connectionStatus ===
      'connected'
    );
  }

  get isConnecting(): boolean {
    return (
      this.connectionStatus ===
        'connecting' ||
      this.connectionStatus ===
        'reconnecting'
    );
  }

  get connectionLabel(): string {
    switch (this.connectionStatus) {
      case 'connected':
        return 'Live';

      case 'connecting':
        return 'Connecting';

      case 'reconnecting':
        return 'Reconnecting';

      default:
        return 'Offline';
    }
  }

  private subscribeToChatEvents():
    void {

    /*
     * Listen for unread-count and conversation
     * changes coming from the backend.
     */
    this.subscriptions.add(
      this.chatSignalr
        .conversationUpdated$
        .subscribe(update => {
          console.log(
            '[Admin dashboard] ConversationUpdated:',
            update
          );

          /*
           * A conversation update may affect both:
           *
           * - total unread messages
           * - total unread conversations
           *
           * Therefore reload the complete summary.
           */
          this.loadSummary();
        })
    );

    /*
     * Keep the connection badge updated during:
     *
     * - initial connection
     * - automatic reconnection
     * - disconnection
     */
    this.subscriptions.add(
      this.chatSignalr
        .connectionStatus$
        .subscribe(status => {
          this.connectionStatus =
            status;

          this.changeDetector
            .markForCheck();
        })
    );
  }

  private async connectSignalr():
    Promise<void> {
    try {
      await this.chatSignalr
        .startConnection();
    } catch (error) {
      console.error(
        '[Admin dashboard] SignalR retry failed:',
        error
      );
    }
  }

  ngOnDestroy(): void {
    /*
     * Remove only this component's subscriptions.
     *
     * Do not stop SignalR because the service
     * connection is shared across the application.
     */
    this.subscriptions.unsubscribe();
  }
}