import {
  HttpClient
} from '@angular/common/http';

import {
  inject,
  Injectable
} from '@angular/core';

import {
  Observable
} from 'rxjs';

import {
  AdminChatSummary,
  AdminConversation,
  ConversationSummary,
  MyConversation
} from '../models/chat.models';

import { environment } from
  '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private readonly http =
    inject(HttpClient);

  private readonly baseUrl =
    `${environment.apiUrl}/api/chat`;

  getMyConversation():
    Observable<MyConversation | null> {
    return this.http.get<
      MyConversation | null
    >(
      `${this.baseUrl}/my-conversation`
    );
  }

  getAdminSummary():
    Observable<AdminChatSummary> {
    return this.http.get<
      AdminChatSummary
    >(
      `${this.baseUrl}/admin/summary`
    );
  }

  getConversations():
    Observable<ConversationSummary[]> {
    return this.http.get<
      ConversationSummary[]
    >(
      `${this.baseUrl}/admin/conversations`
    );
  }

  getConversation(
    conversationId: string
  ): Observable<AdminConversation> {
    return this.http.get<
      AdminConversation
    >(
      `${this.baseUrl}/admin/conversations/${conversationId}`
    );
  }
}