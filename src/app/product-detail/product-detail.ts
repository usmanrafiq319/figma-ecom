import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService } from '../services/product-service';
import { ProductModel } from '../models/product-model';
import { CommonModule } from '@angular/common';
import { CartService } from '../services/cart-service';
import { Quantity } from '../components/quantity/quantity';

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, Quantity, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(ProductService);
  private cartService = inject(CartService);

  // Core signals
  product = signal<ProductModel | null>(null);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  amount = signal<number>(0);
  text = signal<string>('Add To Cart');
  id = signal<string>('');

  // UI State Signals
  activeTab = signal<'description' | 'reviews' | 'shipping'>('description');
  selectedImage = signal<string>('');
  
  // Mock Reviews (Ready to replace with API call)
  reviews = signal<ProductReview[]>([
    {
      id: '1',
      author: 'Alex Johnson',
      rating: 5,
      date: '2026-02-15',
      comment: 'Excellent build quality and fits the description perfectly. Highly recommended!'
    },
    {
      id: '2',
      author: 'Sarah M.',
      rating: 4,
      date: '2026-01-28',
      comment: 'Good overall, super fast shipping. Would buy again.'
    }
  ]);

  // Derived computed values
  averageRating = computed(() => {
    const revs = this.reviews();
    if (!revs.length) return 0;
    const sum = revs.reduce((acc, r) => acc + r.rating, 0);
    return (sum / revs.length).toFixed(1);
  });

  // Supporting secondary images array (uses primary image if additional list isn't present)
  productImages = computed(() => {
    const prod = this.product();
    if (!prod) return [];
    return [prod.url, prod.url, prod.url]; // Scalable to prod.images when model expands
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const productId = params.get('id');

      if (productId) {
        this.id.set(productId);
        this.fetchProduct(productId);
        this.getQuantity();
      } else {
        this.errorMessage.set('Product ID not found in the URL.');
        this.isLoading.set(false);
      }
    });
  }

  getQuantity(): void {
    if (!this.id()) return;
    this.cartService.getItemQuantity(this.id()).subscribe({
      next: (response) => this.amount.set(response),
      error: (err) => console.error(err)
    });
  }

  cartText(): void {
    this.text.set('Added to cart successfully');
    setTimeout(() => this.text.set('Add To Cart'), 2000);
  }

  selectImage(url: string): void {
    this.selectedImage.set(url);
  }

  setTab(tab: 'description' | 'reviews' | 'shipping'): void {
    this.activeTab.set(tab);
  }

  private fetchProduct(id: string): void {
    this.isLoading.set(true);

    this.service.getProduct(id).subscribe({
      next: (data) => {
        this.product.set(data);
        this.selectedImage.set(data.url);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('API Error:', err);
        this.errorMessage.set('Failed to load product details.');
        this.isLoading.set(false);
      }
    });
  }
}