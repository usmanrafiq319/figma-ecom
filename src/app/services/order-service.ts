import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { OrderDto, UpdateOrderStatusDto } from '../models/order';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '/api/order';

  getAllOrders(): Observable<OrderDto[]> {
    return this.http.get<OrderDto[]>(
      `${this.baseUrl}/admin`
    );
  }

  updateOrderStatus(
    orderId: string,
    status: number
  ): Observable<void> {
    const body: UpdateOrderStatusDto = {
      status
    };

    return this.http.put<void>(
      `${this.baseUrl}/admin/${orderId}/status`,
      body
    );
  }
}