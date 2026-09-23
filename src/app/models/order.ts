export interface Order {}
export interface OrderItemDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
}

export interface OrderDto {
  id: string;
  userId: string;
  orderTime: string;
  status: string;
  totalAmount: number;
  orderItems: OrderItemDto[];
}

export interface UpdateOrderStatusDto {
  status: number;
}