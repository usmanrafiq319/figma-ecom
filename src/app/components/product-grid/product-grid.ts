import { Component, inject, OnInit, signal } from '@angular/core';
import { ProductService } from '../../services/product-service';
import { ProductModel } from '../../models/product-model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-product-grid',
  imports: [RouterLink],
  templateUrl: './product-grid.html',
  styleUrl: './product-grid.scss',
})
export class ProductGrid implements OnInit {
  productServie = inject(ProductService);
  products = signal<ProductModel[] | null>(null)
  ngOnInit(): void {
    this.getProducts()
  }
   
getProducts() {
  this.productServie.getProducts().subscribe({
    next: (data) => { 
      // Slice the array to keep only the first 4 items (indexes 0, 1, 2, 3)
       this.products.set(data)
    },
    error: (err) => {
      console.error(err);
    }
  });
}

}
