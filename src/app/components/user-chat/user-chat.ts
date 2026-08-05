import { CommonModule } from '@angular/common';

import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  ChatConnectionStatus,
  ChatMessage,
  ConversationMode
} from '../../models/chat.models';

import {
  ChatApiService
} from '../../services/chat-api-service';

import {
  ChatSignalrService
} from '../../services/chat-signalr-service';

@Component({
  selector: 'app-user-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './user-chat.html',
  styleUrl: './user-chat.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class UserChat
  implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('messageContainer')
  private messageContainer?:ElementRef<HTMLDivElement>;
  isOpen = false;
  messages: ChatMessage[] = [];
  messageText = '';
  unreadCount = 0;
  conversationId?: string;
  conversationMode:ConversationMode = 'Ai';
  togglingAi = false;
  loading = true;
  loadingError = false;
  sending = false;
  connectionStatus:ChatConnectionStatus ='disconnected';
  private shouldScrollToBottom = false;
  private readonly subscriptions =new Subscription();

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
     * Subscribe before connecting so that
     * early SignalR events are not missed.
     */
    this.subscribeToChatEvents();

    this.loadConversation();

    try {
      await this.chatSignalr
        .startConnection();

      console.log(
        '[User chat] SignalR connected'
      );
    } catch (error) {
      console.error(
        '[User chat] Could not connect:',
        error
      );
    }
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScrollToBottom) {
      return;
    }

    this.scrollToBottom();

    this.shouldScrollToBottom = false;
  }

  async toggleChat(): Promise<void> {
    this.isOpen = !this.isOpen;

    if (!this.isOpen) {
      this.changeDetector.markForCheck();
      return;
    }

    this.shouldScrollToBottom = true;

    /*
     * Opening the chat means AI/admin replies
     * are visible to the user.
     */
    if (this.unreadCount > 0) {
      await this.markMessagesAsRead();
    }

    this.changeDetector.markForCheck();
  }

  closeChat(): void {
    this.isOpen = false;

    this.changeDetector.markForCheck();
  }

  async toggleAiMode(): Promise<void> {
    if (
      !this.conversationId ||
      this.togglingAi ||
      !this.isConnected
    ) {
      return;
    }

    this.togglingAi = true;

    const currentMode =
      this.conversationMode;

    const newMode:
      ConversationMode =
        currentMode === 'Ai'
          ? 'Human'
          : 'Ai';

    try {
      await this.chatSignalr
        .toggleAiForConversation(
          this.conversationId
        );

      /*
      * Update immediately for a responsive UI.
      * ConversationUpdated will later confirm
      * the mode returned by the backend.
      */
      this.conversationMode =
        newMode;
    } catch (error) {
      console.error(
        '[User chat] Could not toggle support mode:',
        error
      );
    } finally {
      this.togglingAi = false;

      this.changeDetector
        .markForCheck();
    }
  }
  
  async sendMessage(): Promise<void> {
    const text =
      this.messageText.trim();

    if (
      !text ||
      this.sending ||
      !this.isConnected
    ) {
      return;
    }

    this.sending = true;

    this.changeDetector.markForCheck();

    try {
      await this.chatSignalr
        .sendMessageToAdmins(text);

      /*
       * The backend broadcasts the saved user
       * message through ReceiveMessage.
       */
      this.messageText = '';
      this.shouldScrollToBottom = true;
    } catch (error) {
      console.error(
        '[User chat] Could not send message:',
        error
      );
    } finally {
      this.sending = false;

      this.changeDetector.markForCheck();
    }
  }

  handleEnterKey(
    event: Event
  ): void {
    const keyboardEvent =
      event as KeyboardEvent;

    if (keyboardEvent.shiftKey) {
      return;
    }

    keyboardEvent.preventDefault();

    void this.sendMessage();
  }

  retryConnection(): void {
    void this.chatSignalr
      .startConnection()
      .catch(error => {
        console.error(
          '[User chat] Reconnection failed:',
          error
        );
      });
  }

  retryConversation(): void {
    this.loadConversation();
  }

  isMyMessage(
    message: ChatMessage
  ): boolean {
    return (
      message.senderType === 'User'
    );
  }

  isAdminMessage(
    message: ChatMessage
  ): boolean {
    return (
      message.senderType === 'Admin'
    );
  }

  isAiMessage(
    message: ChatMessage
  ): boolean {
    return (
      message.senderType === 'Ai'
    );
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
        return this.conversationMode === 'Ai'
          ? 'AI assistant online'
          : 'Human support online';

      case 'connecting':
        return 'Connecting';

      case 'reconnecting':
        return 'Reconnecting';

      default:
        return 'Connection unavailable';
    }
  }

  get supportLabel(): string {
    return this.conversationMode === 'Ai'
      ? 'AI assistant'
      : 'Support team';
  }

  private loadConversation(): void {
    this.loading = true;
    this.loadingError = false;

    const subscription =
      this.chatApi
        .getMyConversation()
        .subscribe({
          next: conversation => {
            if (conversation) {
              this.conversationId =
                conversation.id;

              this.conversationMode =
                conversation.mode;

              this.messages = [
                ...conversation.messages
              ];

              this.unreadCount =
                conversation.userUnreadCount;

              this.chatSignalr
                .setInitialUnreadCount(
                  conversation.userUnreadCount
                );
            } else {
              this.conversationId =
                undefined;

              this.conversationMode =
                'Ai';

              this.messages = [];
              this.unreadCount = 0;

              this.chatSignalr
                .setInitialUnreadCount(0);
            }

            this.loading = false;
            this.loadingError = false;
            this.shouldScrollToBottom = true;

            this.changeDetector
              .markForCheck();
          },

          error: error => {
            this.loading = false;
            this.loadingError = true;

            console.error(
              '[User chat] Could not load conversation:',
              error
            );

            this.changeDetector
              .markForCheck();
          }
        });

    this.subscriptions.add(
      subscription
    );
  }

  private subscribeToChatEvents(): void {
    /*
     * Receive user, admin, and AI messages.
     */
    this.subscriptions.add(
      this.chatSignalr
        .messages$
        .subscribe(message => {
          console.log(
            '[User chat] ReceiveMessage:',
            message
          );

          this.handleIncomingMessage(
            message
          );

          this.changeDetector
            .markForCheck();
        })
    );

    /*
     * Receive user unread-count updates.
     */
    this.subscriptions.add(
      this.chatSignalr
        .unreadCount$
        .subscribe(count => {
          console.log(
            '[User chat] UnreadCountUpdated:',
            count
          );

          this.unreadCount =
            this.isOpen ? 0 : count;

          this.changeDetector
            .markForCheck();
        })
    );

    /*
     * Receive mode and unread changes.
     */
    this.subscriptions.add(
      this.chatSignalr
        .conversationUpdated$
        .subscribe(update => {
          console.log(
            '[User chat] ConversationUpdated:',
            update
          );

          /*
           * Before the first REST reload, the
           * conversation ID may not yet exist locally.
           */
          if (!this.conversationId) {
            this.conversationId =
              update.conversationId;
          }

          if (
            update.conversationId !==
            this.conversationId
          ) {
            return;
          }

          this.conversationMode =
            update.mode;

          this.unreadCount =
            this.isOpen
              ? 0
              : update.userUnreadCount;

          this.changeDetector
            .markForCheck();
        })
    );

    /*
     * Keep the connection status updated during
     * reconnects and disconnections.
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

  private handleIncomingMessage(
    message: ChatMessage
  ): void {
    /*
     * Store the conversation ID after the first
     * message creates the conversation.
     */
    if (!this.conversationId) {
      this.conversationId =
        message.conversationId;
    }

    if (
      message.conversationId !==
      this.conversationId
    ) {
      return;
    }

    const alreadyExists =
      this.messages.some(
        existing =>
          existing.id === message.id
      );

    if (!alreadyExists) {
      this.messages = [
        ...this.messages,
        message
      ];

      this.shouldScrollToBottom = true;
    }

    /*
     * User messages do not count as unread for
     * the user.
     */
    if (this.isMyMessage(message)) {
      return;
    }

    /*
     * Both AI and admin messages are incoming
     * support messages.
     */
    if (this.isOpen) {
      void this.markMessagesAsRead();
    }
  }

  private async markMessagesAsRead():
    Promise<void> {
    this.unreadCount = 0;

    this.changeDetector
      .markForCheck();

    try {
      await this.chatSignalr
        .markUserMessagesAsRead();
    } catch (error) {
      console.error(
        '[User chat] Could not mark messages as read:',
        error
      );
    }
  }

  private scrollToBottom(): void {
    const element =
      this.messageContainer
        ?.nativeElement;

    if (!element) {
      return;
    }

    element.scrollTop =
      element.scrollHeight;
  }

  ngOnDestroy(): void {
    /*
     * The SignalR service is shared, so only
     * remove this component's subscriptions.
     */
    this.subscriptions.unsubscribe();
  }
}