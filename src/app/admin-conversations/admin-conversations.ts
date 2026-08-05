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

import {
  Subscription
} from 'rxjs';

import {
  AdminConversation,
  ChatConnectionStatus,
  ChatMessage,
  ConversationSummary
} from '../models/chat.models';

import {
  ChatApiService
} from '../services/chat-api-service';

import {
  ChatSignalrService
} from '../services/chat-signalr-service';

@Component({
  selector: 'app-admin-conversations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './admin-conversations.html',
  styleUrl: './admin-conversations.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class AdminConversations
  implements OnInit,OnDestroy,AfterViewChecked {

  @ViewChild('messageContainer')
  private messageContainer?:ElementRef<HTMLDivElement>;

  conversations: ConversationSummary[] = [];

  selectedConversation?:AdminConversation;

  replyText = '';

  loadingConversations = true;
  loadingMessages = false;

  sending = false;
  togglingAi = false;

  conversationsError = false;
  messagesError = false;

  sidebarOpen = true;

  connectionStatus: ChatConnectionStatus =  'disconnected';

  private shouldScrollToBottom = false;

  private readonly subscriptions = new Subscription();

  constructor( private readonly chatApi: ChatApiService,  private readonly chatSignalr:  ChatSignalrService,private readonly changeDetector: ChangeDetectorRef) {}

  async ngOnInit(): Promise<void> {
    /*
     * Subscribe first so no early SignalR
     * events are missed.
     */
    this.subscribeToChatEvents();

    this.loadConversations();

    try {
      await this.chatSignalr
        .startConnection();

      console.log(
        '[Admin conversations] SignalR connected'
      );
    } catch (error) {
      console.error(
        '[Admin conversations] Could not connect to chat hub:',
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

  loadConversations(): void {
    this.loadingConversations = true;
    this.conversationsError = false;

    const subscription =
      this.chatApi
        .getConversations()
        .subscribe({
          next: conversations => {
            this.conversations =
              conversations;

            this.loadingConversations =
              false;

            this.conversationsError =
              false;

            this.changeDetector
              .markForCheck();
          },

          error: error => {
            this.loadingConversations =
              false;

            this.conversationsError =
              true;

            console.error(
              '[Admin conversations] Could not load conversations:',
              error
            );

            this.changeDetector
              .markForCheck();
          }
        });

    this.subscriptions.add(subscription);
  }

  selectConversation(
    conversation: ConversationSummary
  ): void {
    this.loadingMessages = true;
    this.messagesError = false;

    const subscription =
      this.chatApi
        .getConversation(
          conversation.id
        )
        .subscribe({
          next: result => {
            this.selectedConversation =
              result;

            this.loadingMessages = false;
            this.messagesError = false;

            this.sidebarOpen = false;
            this.shouldScrollToBottom = true;

            /*
             * Reset unread count locally.
             */
            this.updateConversationSummary(
              result.id,
              {
                adminUnreadCount: 0,
                mode: result.mode,
                userUnreadCount:
                  result.userUnreadCount
              }
            );

            this.selectedConversation = {
              ...result,
              adminUnreadCount: 0
            };

            this.changeDetector
              .markForCheck();

            void this.markSelectedConversationAsRead(
              result.id
            );
          },

          error: error => {
            this.loadingMessages = false;
            this.messagesError = true;

            console.error(
              '[Admin conversations] Could not load conversation:',
              error
            );

            this.changeDetector
              .markForCheck();
          }
        });

    this.subscriptions.add(subscription);
  }

  retrySelectedConversation(): void {
    const selectedId =
      this.selectedConversation?.id;

    if (!selectedId) {
      return;
    }

    const summary =
      this.conversations.find(
        conversation =>
          conversation.id === selectedId
      );

    if (summary) {
      this.selectConversation(summary);
    }
  }

  handleReplyEnterKey(
    event: Event
  ): void {
    const keyboardEvent =
      event as KeyboardEvent;

    if (keyboardEvent.shiftKey) {
      return;
    }

    keyboardEvent.preventDefault();

    void this.sendReply();
  }

  async sendReply(): Promise<void> {
    const text =
      this.replyText.trim();

    if (
      !text ||
      !this.selectedConversation ||
      this.sending ||
      !this.isConnected
    ) {
      return;
    }

    this.sending = true;

    try {
      await this.chatSignalr
        .sendMessageToUser(
          this.selectedConversation.id,
          text
        );

      /*
       * The backend broadcasts the new message.
       * Do not add it manually.
       */
      this.replyText = '';

      /*
       * An admin reply changes the conversation
       * to Human mode on the backend.
       *
       * Update locally immediately. The later
       * ConversationUpdated event will confirm it.
       */
      this.selectedConversation = {
        ...this.selectedConversation,
        mode: 'Human'
      };

      this.updateConversationSummary(
        this.selectedConversation.id,
        {
          mode: 'Human'
        }
      );
    } catch (error) {
      console.error(
        '[Admin conversations] Could not send admin reply:',
        error
      );
    } finally {
      this.sending = false;

      this.changeDetector
        .markForCheck();
    }
  }

  async toggleAi(): Promise<void> {
    if (
      !this.selectedConversation ||
      this.togglingAi ||
      !this.isConnected
    ) {
      return;
    }

    this.togglingAi = true;

    const conversationId =
      this.selectedConversation.id;

    const currentMode =
      this.selectedConversation.mode;

    const newMode =
      currentMode === 'Ai'
        ? 'Human'
        : 'Ai';

    try {
      await this.chatSignalr
        .toggleAiForConversation(
          conversationId
        );

      /*
      * Update the UI immediately.
      * ConversationUpdated from SignalR
      * will later confirm the backend value.
      */
      this.selectedConversation = {
        ...this.selectedConversation,
        mode: newMode
      };

      this.updateConversationSummary(
        conversationId,
        {
          mode: newMode
        }
      );
    } catch (error) {
      console.error(
        '[Admin conversations] Could not toggle AI mode:',
        error
      );
    } finally {
      this.togglingAi = false;

      this.changeDetector
        .markForCheck();
    }
  }

  retryConnection(): void {
    void this.chatSignalr
      .startConnection()
      .catch(error => {
        console.error(
          '[Admin conversations] Reconnection failed:',
          error
        );
      });
  }

  isUserMessage(
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

  isSelectedConversation(
    conversationId: string
  ): boolean {
    return (
      this.selectedConversation?.id ===
      conversationId
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
        return 'Live';

      case 'connecting':
        return 'Connecting';

      case 'reconnecting':
        return 'Reconnecting';

      default:
        return 'Offline';
    }
  }

  openSidebar(): void {
    this.sidebarOpen = true;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  private subscribeToChatEvents(): void {
    this.subscriptions.add(
      this.chatSignalr
        .messages$
        .subscribe(message => {
          console.log(
            '[Admin conversations] ReceiveMessage:',
            message
          );

          this.handleIncomingMessage(
            message
          );

          this.changeDetector
            .markForCheck();
        })
    );

    this.subscriptions.add(
      this.chatSignalr
        .conversationUpdated$
        .subscribe(update => {
          console.log(
            '[Admin conversations] ConversationUpdated:',
            update
          );

          const conversationExists =
            this.conversations.some(
              conversation =>
                conversation.id ===
                update.conversationId
            );

          /*
           * A user's first message may create a
           * completely new conversation.
           */
          if (!conversationExists) {
            this.loadConversations();
            return;
          }

          this.updateConversationSummary(
            update.conversationId,
            {
              adminUnreadCount:
                update.adminUnreadCount,

              userUnreadCount:
                update.userUnreadCount,

              mode:
                update.mode
            }
          );

          if (
            this.selectedConversation?.id ===
            update.conversationId
          ) {
            this.selectedConversation = {
              ...this.selectedConversation,

              adminUnreadCount:
                update.adminUnreadCount,

              userUnreadCount:
                update.userUnreadCount,

              mode:
                update.mode
            };
          }

          this.changeDetector
            .markForCheck();
        })
    );

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
    const selectedMatches =
      this.selectedConversation?.id ===
      message.conversationId;

    if (selectedMatches) {
      const alreadyExists =
        this.selectedConversation!
          .messages
          .some(existing =>
            existing.id === message.id
          );

      if (!alreadyExists) {
        this.selectedConversation = {
          ...this.selectedConversation!,

          messages: [
            ...this.selectedConversation!
              .messages,
            message
          ]
        };

        this.shouldScrollToBottom = true;
      }

      /*
       * Only user messages create admin unread
       * messages.
       *
       * If that conversation is already open,
       * mark them as read immediately.
       */
      if (this.isUserMessage(message)) {
        void this.markSelectedConversationAsRead(
          message.conversationId
        );
      }
    }

    /*
     * Update last message and ordering locally
     * instead of reloading the entire list for
     * every SignalR event.
     */
    this.updateSidebarForIncomingMessage(
      message
    );
  }

  private updateSidebarForIncomingMessage(
    message: ChatMessage
  ): void {
    const existing =
      this.conversations.find(
        conversation =>
          conversation.id ===
          message.conversationId
      );

    /*
     * This can happen when a brand-new user sends
     * their first message.
     */
    if (!existing) {
      this.loadConversations();
      return;
    }

    const selected =
      this.isSelectedConversation(
        message.conversationId
      );

    const updatedConversation:
      ConversationSummary = {
        ...existing,

        lastMessage:
          message.text,

        lastMessageAt:
          message.sentAt,

        adminUnreadCount:
          this.isUserMessage(message) &&
          !selected
            ? Math.max(
                1,
                existing.adminUnreadCount
              )
            : selected
              ? 0
              : existing.adminUnreadCount
      };

    this.conversations = [
      updatedConversation,

      ...this.conversations.filter(
        conversation =>
          conversation.id !==
          message.conversationId
      )
    ];
  }

  private updateConversationSummary(
    conversationId: string,
    updates: Partial<
      ConversationSummary
    >
  ): void {
    this.conversations =
      this.conversations.map(
        conversation =>
          conversation.id ===
          conversationId
            ? {
                ...conversation,
                ...updates
              }
            : conversation
      );
  }

  private async markSelectedConversationAsRead(
    conversationId: string
  ): Promise<void> {
    try {
      await this.chatSignalr
        .markAdminMessagesAsRead(
          conversationId
        );

      this.updateConversationSummary(
        conversationId,
        {
          adminUnreadCount: 0
        }
      );

      if (
        this.selectedConversation?.id ===
        conversationId
      ) {
        this.selectedConversation = {
          ...this.selectedConversation,
          adminUnreadCount: 0
        };
      }

      this.changeDetector
        .markForCheck();
    } catch (error) {
      console.error(
        '[Admin conversations] Could not mark messages as read:',
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
     * Do not stop the SignalR service because it
     * is shared throughout the application.
     */
    this.subscriptions.unsubscribe();
  }
}