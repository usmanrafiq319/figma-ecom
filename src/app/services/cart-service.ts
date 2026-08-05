import { inject, Injectable, signal } from '@angular/core';
import { ProductModel } from '../models/product-model';
import { CartModel, CartItem } from '../models/cart-item';
import { HttpClient } from '@angular/common/http';
import { Cartitemrequest } from '../models/cartitemrequest';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  http = inject(HttpClient)
  cart = signal<CartItem[]>([])
  // url = 'https://localhost:7011/api/'
private readonly url =   `${environment.apiUrl}/api/cart`;

addProduct(cartItem: Cartitemrequest) {

  return this.http.post<Cartitemrequest>(this.url,cartItem,{
    withCredentials: true // <-- CRITICAL: Allows browser cookies to pass to the API
  })

}

getCart() {
  return this.http.get<CartModel>(this.url, { 
    withCredentials: true // <-- CRITICAL: Allows browser cookies to pass to the API
  });
}

getItemQuantity(id: string ){
return this.http.get<number>(`${this.url}/${id}`,{
      withCredentials: true // <-- CRITICAL: Allows browser cookies to pass to the API
});
}
}
