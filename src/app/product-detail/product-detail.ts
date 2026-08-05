import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../services/product-service';
import { ProductModel } from '../models/product-model';
import { CommonModule } from '@angular/common';
import { CartService } from '../services/cart-service';
import { Quantity } from '../components/quantity/quantity';
import { Cartitemrequest } from '../models/cartitemrequest';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, Quantity],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(ProductService);
  private cartService = inject(CartService);

  // Convert all state variables to Signals for perfect UI updates
  product = signal<ProductModel | null>(null);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  amount = signal<number>(0)
  text = signal<string>('Add To Cart')
  id = signal<string>(" ")

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const productId = params.get('id');

      if (productId) {
        this.fetchProduct(productId);
        this.id.set(productId);
        this.getQuantity();
      } else {
        this.errorMessage.set('Product ID not found in the URL.');
        this.isLoading.set(false);
      }
    });
  }

  getQuantity(){
    this.cartService.getItemQuantity(this.id()).subscribe(
      {
        next:response=>{
         console.log(response);
         this.amount.set(response);
        },
        error:err=>{
          console.error(err);
        }
      }
    )
  }

  cartText(){
    this.text.set("Added to cart successfully");
    setTimeout(()=>{this.text.set("Add To Cart")},2000);
  }

  private fetchProduct(id: string): void {
    this.isLoading.set(true);

    this.service.getProduct(id).subscribe({
      next: (data) => {
        this.product.set(data);
        this.isLoading.set(false); // Update signal
        console.log("we done it")
      },
      error: (err) => {
        console.error('API Error:', err);
        this.errorMessage.set('Failed to load product details.');
        this.isLoading.set(false); // Update signal
      }
    });
  }



}
