import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CartService } from '../services/cart-service';
import { Quantity } from '../components/quantity/quantity';
import { map } from 'rxjs';
import { CartTotalPipe } from '../pipes/cart-total-pipe';
import { CartItem, CartModel } from '../models/cart-item';

@Component({
  selector: 'app-cart',
  imports: [Quantity],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart implements OnInit {
  cartService = inject(CartService)
  cart = signal<CartModel|null>(null); 
  
  checkout() {

      this.cartService.getCart().subscribe({

          next: response => {

              this.cart.set(response);  
              console.log(response);
              console.log(this.cart())

          },

          error: err => {

              console.log(err);

          }

      });

  }

  ngOnInit(): void {
    this.checkout();
  }
  //   // 1. Keep your computed sum just like this
  // sum = computed(() => {
  //   let totalCost = 0;
  //   for (const item of this.cart()) {
  //     totalCost += item.price * item.quantity;
  //   }
  //   return totalCost;
  // });

  // // 2. Add this simple method to force a recalculation
  // recalculateTotal() {
  //   // This tells the signal: "The data inside the array changed, refresh yourself!"
  //   this.cart.update(currentCart => [...currentCart]);
  // }


// changequantity(productId: string, newQuantity: number) {
//   this.cart.update(currentCart => 
//     currentCart.map(item => 
//       item.productId === productId 
//         ? { ...item, quantity: Number(newQuantity) } // Force it to be a real number!
//         : item 
//     )
//   );
// }

}
