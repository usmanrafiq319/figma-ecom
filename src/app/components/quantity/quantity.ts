import { Component, computed, inject, input, linkedSignal, model, output } from '@angular/core';
import { CartService } from '../../services/cart-service';
import { Cartitemrequest } from '../../models/cartitemrequest';

@Component({
  selector: 'app-quantity',
  imports: [],
  templateUrl: './quantity.html',
  styleUrl: './quantity.scss',
})
export class Quantity {
  service = inject(CartService)
  amount = input<number>(1)
  id = input<string>(" ")
  cartUpdated = output<void>()
  localquantity = linkedSignal(()=>this.amount())
  // 3. Computed reactive payload that always reads current states
  item = computed<Cartitemrequest>(() => {
    return {
      productId: this.id(),
      quantity: this.localquantity()
    };
  });

  increment() {
   this.localquantity.update(q=>q+1);
   this.addItem();
  }
  decrement() {
    if (this.localquantity() <= 1) {
      this.localquantity.set(0);

    } else {
    this.localquantity.update(q=>q-1);
    }
    this.addItem();
  }

  addItem(){
    this.service.addProduct(this.item()).subscribe({
      next:response=>{
          console.log(response);
          this.cartUpdated.emit();
        },
      error:err=>{
        console.error(err)
      }  
      
    })
  }
}
