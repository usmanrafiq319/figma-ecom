import { inject, Injectable } from '@angular/core';

import {HubConnection,HubConnectionBuilder,HubConnectionState,LogLevel} from '@microsoft/signalr';

import {BehaviorSubject,Subject} from 'rxjs';

import {ChatConnectionStatus,ChatMessage,ConversationUpdated} from '../models/chat.models';

import { environment } from'../../environments/environment';

import { AuthService } from './auth-service';

@Injectable({
  providedIn: 'root'
})
export class ChatSignalrService {

  private readonly authService = inject(AuthService);

  private connection?: HubConnection;

  private startPromise?: Promise<void>;

  /*
   * Prevents a connection from becoming active
   * after logout was started.
   */
  private logoutInProgress = false;

  private readonly messageSubject = new Subject<ChatMessage>();

  private readonly conversationUpdatedSubject = new Subject<ConversationUpdated>();

  private readonly unreadCountSubject = new BehaviorSubject<number>(0);

  private readonly connectionStatusSubject = new BehaviorSubject<ChatConnectionStatus>('disconnected');

  readonly messages$ = this.messageSubject.asObservable();

  readonly conversationUpdated$ = this.conversationUpdatedSubject.asObservable();

  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  readonly connectionStatus$ = this.connectionStatusSubject.asObservable();

  async startConnection(): Promise<void> {
    /*
     * A new authenticated session is starting.
     */
    this.logoutInProgress = false;

    const token = this.authService.getToken();

    /*
     * Do not attempt SignalR authentication
     * without an access token.
     */
    if (!token) {
      this.connectionStatusSubject.next(
        'disconnected'
      );

      throw new Error(
        'Cannot start chat without an access token.'
      );
    }

    if (this.connection?.state === HubConnectionState.Connected) {
      return;
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    if ( this.connection?.state === HubConnectionState.Connecting ||this.connection?.state === HubConnectionState.Reconnecting) {
      await this.waitUntilConnected();
      return;
    }

    this.connectionStatusSubject.next(
      'connecting'
    );

    const newConnection =
      new HubConnectionBuilder()
        .withUrl(
          `${environment.apiUrl}/chathub`,
          {
            accessTokenFactory: () =>
              this.authService.getToken() ?? ''
          }
        )
        .withAutomaticReconnect([
          0,
          2000,
          5000,
          10000
        ])
        .configureLogging(
          LogLevel.Information
        )
        .build();

    this.connection = newConnection;

    this.registerLifecycleEvents(
      newConnection
    );

    this.registerHubEvents(
      newConnection
    );

    this.startPromise =
      newConnection
        .start()
        .then(() => {
          /*
           * Logout may have happened while the
           * connection was being established.
           */
          if (
            this.logoutInProgress ||
            this.connection !== newConnection
          ) {
            return newConnection.stop();
          }

          this.connectionStatusSubject.next(
            'connected'
          );

          console.log(
            '[SignalR] Chat connected'
          );

          return;
        })
        .catch(error => {
          /*
           * Do not show a normal logout cancellation
           * as an application connection error.
           */
          if (!this.logoutInProgress) {
            console.error(
              '[SignalR] Connection failed:',
              error
            );
          }

          this.connectionStatusSubject.next(
            'disconnected'
          );

          if (!this.logoutInProgress) {
            throw error;
          }
        })
        .finally(() => {
          this.startPromise = undefined;
        });

    return this.startPromise;
  }

  async stopConnection(): Promise<void> {
    this.logoutInProgress = true;

    const activeConnection =
      this.connection;

    /*
     * Remove the shared reference immediately so
     * another component cannot invoke this
     * connection during logout.
     */
    this.connection = undefined;

    try {
      if (activeConnection) {
        await activeConnection.stop();
      }
    } catch (error) {
      console.warn(
        '[SignalR] Error while stopping connection:',
        error
      );
    } finally {
      this.startPromise = undefined;

      this.resetChatState();

      console.log(
        '[SignalR] Chat disconnected and reset'
      );
    }
  }

  /*
   * Call this during logout to ensure data from
   * one account does not remain for the next user.
   */
  private resetChatState(): void {
    this.unreadCountSubject.next(0);

    this.connectionStatusSubject.next(
      'disconnected'
    );
  }

  setInitialUnreadCount(
    count: number
  ): void {
    this.unreadCountSubject.next(
      Math.max(0, count)
    );
  }

  async sendMessageToAdmins(
    text: string
  ): Promise<void> {
    await this.ensureConnected();

    await this.connection!.invoke(
      'SendMessageToAdmins',
      text
    );
  }

  async sendMessageToUser(
    conversationId: string,
    text: string
  ): Promise<void> {
    await this.ensureConnected();

    await this.connection!.invoke(
      'SendMessageToUser',
      conversationId,
      text
    );
  }

  async markAdminMessagesAsRead(
    conversationId: string
  ): Promise<void> {
    await this.ensureConnected();

    await this.connection!.invoke(
      'MarkAdminMessagesAsRead',
      conversationId
    );
  }

  async markUserMessagesAsRead():Promise<void> {
    await this.ensureConnected();

    await this.connection!.invoke(
      'MarkUserMessagesAsRead'
    );

    this.unreadCountSubject.next(0);
  }

  async toggleAiForConversation(
    conversationId: string
  ): Promise<void> {
    await this.ensureConnected();

    await this.connection!.invoke(
      'ToggleAiForConversation',
      conversationId
    );
  }

  private registerHubEvents(
    connection: HubConnection
  ): void {
    connection.on(
      'ReceiveMessage',
      (message: ChatMessage) => {
        /*
         * Ignore events completing during logout.
         */
        if (this.logoutInProgress) {
          return;
        }

        this.messageSubject.next(message);
      }
    );

    connection.on(
      'ConversationUpdated',
      (
        update: ConversationUpdated
      ) => {
        if (this.logoutInProgress) { return;}
        this.conversationUpdatedSubject.next(update);
      }
    );

    connection.on(
      'UnreadCountUpdated',
      (count: number) => {
        if (this.logoutInProgress) {
          return;
        }

        this.unreadCountSubject.next(
          Math.max(0, count)
        );
      }
    );
  }

  private registerLifecycleEvents(
    connection: HubConnection
  ): void {
    connection.onreconnecting(error => {
      if (this.logoutInProgress) {
        return;
      }

      this.connectionStatusSubject.next(
        'reconnecting'
      );

      console.warn(
        '[SignalR] Reconnecting:',
        error
      );
    });

    connection.onreconnected(
      connectionId => {
        if (this.logoutInProgress) {
          void connection.stop();
          return;
        }

        this.connectionStatusSubject.next(
          'connected'
        );

        console.log(
          '[SignalR] Reconnected:',
          connectionId
        );
      }
    );

    connection.onclose(error => {
      this.connectionStatusSubject.next(
        'disconnected'
      );

      if (
        error &&
        !this.logoutInProgress
      ) {
        console.warn(
          '[SignalR] Closed unexpectedly:',
          error
        );
      }
    });
  }

  private isConnectionConnected(): boolean {
    return (
      this.connection?.state ===
      HubConnectionState.Connected
    );
  }

  private async ensureConnected(): Promise<void> {
    if (this.logoutInProgress) {
      throw new Error(
        'Chat is unavailable during logout.'
      );
    }

    if (this.isConnectionConnected()) {
      return;
    }

    await this.startConnection();

    if (!this.isConnectionConnected()) {
      throw new Error(
        'The chat connection is unavailable.'
      );
    }
  }

  private async waitUntilConnected(
    timeoutMilliseconds = 15000
  ): Promise<void> {
    const startedAt = Date.now();

    while (
      Date.now() - startedAt <
      timeoutMilliseconds
    ) {
      if (this.logoutInProgress) {
        throw new Error(
          'Connection cancelled during logout.'
        );
      }

      if (
        this.connection?.state ===
        HubConnectionState.Connected
      ) {
        return;
      }

      if (
        this.connection?.state ===
        HubConnectionState.Disconnected
      ) {
        break;
      }

      await new Promise<void>(
        resolve =>
          setTimeout(resolve, 200)
      );
    }

    throw new Error(
      'SignalR could not establish a connection.'
    );
  }

}