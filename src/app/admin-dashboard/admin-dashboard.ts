import {ChangeDetectionStrategy,ChangeDetectorRef,Component,OnDestroy,OnInit} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatSignalrService } from '../services/chat-signalr-service';
import { ChatApiService } from '../services/chat-api-service';
import { ChatConnectionStatus } from '../models/chat.models';
import { ProductService } from '../services/product-service';
import { OrderService } from '../services/order-service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboard implements OnInit, OnDestroy {
  unreadMessages = 0;
  unreadConversations = 0;
  loading = true;
  summaryError = false;

  // Product Section State
  totalProducts = 0;
  productsLoading = true;
  productsError = false;

  // Order Section State
  totalOrders = 0;
  pendingOrders = 0;
  processingOrders = 0;
  ordersLoading = true;
  ordersError = false;

  connectionStatus: ChatConnectionStatus = 'disconnected';
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly chatApi: ChatApiService,
    private readonly chatSignalr: ChatSignalrService,
    private readonly orderService: OrderService,
    private readonly productService: ProductService,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.subscribeToChatEvents();
    this.loadSummary();
    this.loadProductsSummary();
    this.loadOrdersSummary();
    try {
      await this.chatSignalr.startConnection();
      console.log('[Admin dashboard] SignalR connected');
    } catch (error) {
      console.error('[Admin dashboard] Could not connect to chat:', error);
    }
  }

  loadSummary(): void {
    this.loading = true;
    this.summaryError = false;

    const summarySubscription = this.chatApi.getAdminSummary().subscribe({
      next: summary => {
        this.unreadMessages = summary.unreadMessages;
        this.unreadConversations = summary.unreadConversations;
        this.loading = false;
        this.summaryError = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        this.loading = false;
        this.summaryError = true;
        console.error('[Admin dashboard] Could not load chat summary:', error);
        this.changeDetector.markForCheck();
      }
    });

    this.subscriptions.add(summarySubscription);
  }

  loadProductsSummary(): void {
    this.productsLoading = true;
    this.productsError = false;

    const productsSub = this.productService.getProducts().subscribe({
      next: products => {
        this.totalProducts = products.length;
        this.productsLoading = false;
        this.productsError = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        this.productsLoading = false;
        this.productsError = true;
        console.error('[Admin dashboard] Could not load products:', error);
        this.changeDetector.markForCheck();
      }
    });

    this.subscriptions.add(productsSub);
  }

  retryConnection(): void {
    void this.connectSignalr();
  }

  retrySummary(): void {
    this.loadSummary();
  }

  retryProducts(): void {
    this.loadProductsSummary();
  }

  get isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  get isConnecting(): boolean {
    return (
      this.connectionStatus === 'connecting' ||
      this.connectionStatus === 'reconnecting'
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

  private subscribeToChatEvents(): void {
    this.subscriptions.add(
      this.chatSignalr.conversationUpdated$.subscribe(update => {
        console.log('[Admin dashboard] ConversationUpdated:', update);
        this.loadSummary();
      })
    );

    this.subscriptions.add(
      this.chatSignalr.connectionStatus$.subscribe(status => {
        this.connectionStatus = status;
        this.changeDetector.markForCheck();
      })
    );
  }

  private async connectSignalr(): Promise<void> {
    try {
      await this.chatSignalr.startConnection();
    } catch (error) {
      console.error('[Admin dashboard] SignalR retry failed:', error);
    }
  }

  loadOrdersSummary(): void {
  this.ordersLoading = true;
  this.ordersError = false;

  const ordersSub = this.orderService.getAllOrders().subscribe({
    next: orders => {
      this.totalOrders = orders.length;

      this.pendingOrders = orders.filter(
        order => order.status.toLowerCase() === 'pending'
      ).length;

      this.processingOrders = orders.filter(
        order => order.status.toLowerCase() === 'processing'
      ).length;

      this.ordersLoading = false;
      this.ordersError = false;

      this.changeDetector.markForCheck();
    },

    error: error => {
      this.ordersLoading = false;
      this.ordersError = true;

      console.error(
        '[Admin dashboard] Could not load orders:',
        error
      );

      this.changeDetector.markForCheck();
    }
  });

  this.subscriptions.add(ordersSub);
  }

  retryOrders(): void {
  this.loadOrdersSummary();
  
}
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}