export type ChatSenderType =
  | 'User'
  | 'Admin'
  | 'Ai';

export type ConversationMode =
  | 'Ai'
  | 'Human';

export type ChatConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export interface ChatMessage {
  id: string;

  conversationId: string;

  /*
   * The normal user who owns this conversation.
   */
  userId: string;

  /*
   * User message:
   * senderId contains the user's ID.
   *
   * Admin message:
   * senderId contains the admin's ID.
   *
   * AI message:
   * senderId is null.
   */
  senderId: string | null;

  senderType: ChatSenderType;

  text: string;

  sentAt: string;
}

export interface MyConversation {
  id: string;

  userId: string;

  createdAt: string;

  userUnreadCount: number;

  mode: ConversationMode;

  messages: ChatMessage[];
}

export interface ConversationSummary {
  id: string;

  userId: string;

  userName: string;

  createdAt: string;

  adminUnreadCount: number;

  userUnreadCount: number;

  mode: ConversationMode;

  lastMessage: string | null;

  lastMessageAt: string | null;
}

export interface AdminConversation {
  id: string;

  userId: string;

  userName: string;

  createdAt: string;

  adminUnreadCount: number;

  userUnreadCount: number;

  mode: ConversationMode;

  messages: ChatMessage[];
}

export interface AdminChatSummary {
  unreadMessages: number;

  unreadConversations: number;
}

export interface ConversationUpdated {
  conversationId: string;

  userId: string;

  adminUnreadCount: number;

  userUnreadCount: number;

  mode: ConversationMode;
}