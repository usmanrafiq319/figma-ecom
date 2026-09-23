import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderService } from '../services/order-service';
import { Subscription } from 'rxjs';
import { OrderDto } from '../models/order';

type OrderFilter =
  | 'all'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

@Component({
  selector: 'app-admin-orders',
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.scss',
})




export class AdminOrders implements OnInit, OnDestroy {

  private readonly orderService = inject(OrderService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  private readonly subscriptions = new Subscription();

  orders: OrderDto[] = [];

  loading = true;
  error = false;

  selectedOrder: OrderDto | null = null;

  activeFilter: OrderFilter = 'all';

  updatingOrderId: string | null = null;

  readonly filters: {
    label: string;
    value: OrderFilter;
  }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' }
  ];

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.error = false;

    const subscription = this.orderService.getAllOrders().subscribe({
      next: orders => {
        this.orders = orders;
        this.loading = false;
        this.error = false;

        this.changeDetector.markForCheck();
      },

      error: error => {
        console.error(
          '[Admin orders] Could not load orders:',
          error
        );

        this.loading = false;
        this.error = true;

        this.changeDetector.markForCheck();
      }
    });

    this.subscriptions.add(subscription);
  }

  retry(): void {
    this.loadOrders();
  }

  setFilter(filter: OrderFilter): void {
    this.activeFilter = filter;
    this.selectedOrder = null;
  }

  get filteredOrders(): OrderDto[] {
    if (this.activeFilter === 'all') {
      return this.orders;
    }

    return this.orders.filter(
      order =>
        order.status.toLowerCase() ===
        this.activeFilter
    );
  }

  selectOrder(order: OrderDto): void {
    if (this.selectedOrder?.id === order.id) {
      this.selectedOrder = null;
    } else {
      this.selectedOrder = order;
    }

    this.changeDetector.markForCheck();
  }

  updateStatus(
    order: OrderDto,
    status: number
  ): void {

    if (this.updatingOrderId !== null) {
      return;
    }

    this.updatingOrderId = order.id;

    const subscription =
      this.orderService
        .updateOrderStatus(order.id, status)
        .subscribe({

          next: () => {

            const statusName =
              this.getStatusName(status);

            order.status = statusName;

            this.updatingOrderId = null;

            this.changeDetector.markForCheck();
          },

          error: error => {

            console.error(
              '[Admin orders] Could not update order status:',
              error
            );

            this.updatingOrderId = null;

            this.changeDetector.markForCheck();
          }
        });

    this.subscriptions.add(subscription);
  }

  getStatusName(status: number): string {
    switch (status) {
      case 0:
        return 'Pending';

      case 1:
        return 'Processing';

      case 2:
        return 'Shipped';

      case 3:
        return 'Delivered';

      case 4:
        return 'Cancelled';

      default:
        return 'Unknown';
    }
  }

  getStatusValue(status: string): number {
    switch (status.toLowerCase()) {
      case 'pending':
        return 0;

      case 'processing':
        return 1;

      case 'shipped':
        return 2;

      case 'delivered':
        return 3;

      case 'cancelled':
        return 4;

      default:
        return 0;
    }
  }

  getStatusClasses(status: string): string {
    switch (status.toLowerCase()) {

      case 'pending':
        return 'bg-amber-100 text-amber-700';

      case 'processing':
        return 'bg-blue-100 text-blue-700';

      case 'shipped':
        return 'bg-indigo-100 text-indigo-700';

      case 'delivered':
        return 'bg-emerald-100 text-emerald-700';

      case 'cancelled':
        return 'bg-red-100 text-red-700';

      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(date));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}