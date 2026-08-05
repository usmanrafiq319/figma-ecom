import { Pipe, PipeTransform } from '@angular/core';
import { CartItem } from '../models/cart-item';

@Pipe({
  name: 'cartTotal',
  //  standalone: true,
  pure:false
})
export class CartTotalPipe implements PipeTransform {
  transform(cartArray:CartItem[]|null|undefined): number { //cartArray? also mean undefine 
    if (!cartArray || cartArray == null){
      return 0;
    }

    let total =0;
    for(const item of cartArray){
      total += item.price*item.quantity;
    }
    return total;
  }
}
