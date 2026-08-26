import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ProductModel } from '../models/product-model';
import { ProductService } from '../services/product-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-product-category',
  imports: [CommonModule, FormsModule,RouterLink],
  templateUrl: './product-category.html',
  styleUrl: './product-category.scss',
})

export class ProductCategory implements OnInit {

  // Original products received from API
  products: ProductModel[] = [];

  // Products currently displayed after filters
  filteredProducts: ProductModel[] = [];

  // Dynamic categories
  categories: string[] = [];

  // Currently selected category
  selectedCategory: string = 'All Products';

  // Price filter
  minPrice: number = 0;
  maxPrice: number = 0;

  // Actual maximum price from API
  productMaxPrice: number = 0;

  // Temporary UI values for future properties
  colors: string[] = [
    '#000000',
    '#FFFFFF',
    '#808080',
    '#0000FF',
    '#FF0000',
    '#FFFF00',
    '#008000',
    '#800080',
    '#FFA500',
    '#A52A2A'
  ];

  sizes: string[] = [
    'Small',
    'Medium',
    'Large',
    'X-Large'
  ];

  dressStyles: string[] = [
    'Casual',
    'Formal',
    'Party',
    'Gym',
    'Sport'
  ];

  selectedColor: string | null = null;
  selectedSize: string | null = null;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 9;

  constructor(
    private productService: ProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  /**
   * Get products from API
   */
loadProducts(): void {

  this.productService.getProducts().subscribe({

    next: (products) => {

      this.products = products;

      // Create categories dynamically
      this.categories = [
        'All Products',
        ...new Set(
          products
            .map(product => product.category)
            .filter(
              category =>
                category &&
                category.trim() !== ''
            )
        )
      ];

      // Find price range dynamically
      if (products.length > 0) {

        const prices = products.map(
          product => product.price
        );

        this.minPrice = Math.min(...prices);

        this.productMaxPrice = Math.max(...prices);

        this.maxPrice = this.productMaxPrice;

      } else {

        this.minPrice = 0;
        this.maxPrice = 0;
        this.productMaxPrice = 0;

      }

      // Initially show everything
      this.filteredProducts = [...this.products];

      // Force Angular to update the template
      this.cdr.detectChanges();
    },

    error: (error) => {

      console.error(
        'Error loading products:',
        error
      );

    }

  });
}

  /**
   * Select category
   */
  selectCategory(category: string): void {

    this.selectedCategory = category;

    this.currentPage = 1;

    this.applyFilter();
  }

  /**
   * Apply category + price filters
   */
  applyFilter(): void {

    this.filteredProducts = this.products.filter(product => {

      // Category condition
      const categoryMatches =
        this.selectedCategory === 'All Products' ||
        product.category === this.selectedCategory;

      // Price condition
      const priceMatches =
        product.price >= this.minPrice &&
        product.price <= this.maxPrice;

      return categoryMatches && priceMatches;
    });

  }

  /**
   * Color selection
   * Currently only UI state.
   * Later connect this with product.color.
   */
  selectColor(color: string): void {

    if (this.selectedColor === color) {
      this.selectedColor = null;
    } else {
      this.selectedColor = color;
    }

    // Later:
    // this.applyFilter();
  }

  /**
   * Size selection
   * Currently only UI state.
   * Later connect this with product.size.
   */
  selectSize(size: string): void {

    if (this.selectedSize === size) {
      this.selectedSize = null;
    } else {
      this.selectedSize = size;
    }

    // Later:
    // this.applyFilter();
  }

  /**
   * Reset all filters
   */
  clearFilters(): void {

    this.selectedCategory = 'All Products';

    this.minPrice =
      this.products.length > 0
        ? Math.min(...this.products.map(p => p.price))
        : 0;

    this.maxPrice = this.productMaxPrice;

    this.selectedColor = null;
    this.selectedSize = null;

    this.currentPage = 1;

    this.filteredProducts = [...this.products];
  }

  /**
   * Total number of currently filtered products
   */
  get totalProducts(): number {
    return this.filteredProducts.length;
  }

  /**
   * Products shown on current page
   */
  get paginatedProducts(): ProductModel[] {

    const startIndex =
      (this.currentPage - 1) * this.pageSize;

    const endIndex =
      startIndex + this.pageSize;

    return this.filteredProducts.slice(
      startIndex,
      endIndex
    );
  }

  /**
   * Total number of pages
   */
  get totalPages(): number {

    return Math.ceil(
      this.filteredProducts.length / this.pageSize
    );
  }

  /**
   * Generate page numbers
   */
  get pageNumbers(): number[] {

    return Array.from(
      { length: this.totalPages },
      (_, index) => index + 1
    );
  }

  /**
   * Go to page
   */
  goToPage(page: number): void {

    if (
      page >= 1 &&
      page <= this.totalPages
    ) {
      this.currentPage = page;
    }
  }

  /**
   * Previous page
   */
  previousPage(): void {

    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  /**
   * Next page
   */
  nextPage(): void {

    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  /**
   * Track products efficiently with Angular
   */
  trackByProductId(
    index: number,
    product: ProductModel
  ): string {
    return product.id;
  }

}