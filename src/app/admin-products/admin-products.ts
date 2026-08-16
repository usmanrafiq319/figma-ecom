import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProductService } from '../services/product-service';

export interface ProductModel {
  id: string;
  title: string;
  price: number;
  description: string;
  url: string;
  quantity?: number;
}

export interface CreateProductDto {
  title: string;
  price: number;
  quantity: number;
  description?: string;
  image?: File | null;
}

export function toProductFormData(dto: CreateProductDto): FormData {
  const formData = new FormData();
  formData.append('title', dto.title);
  formData.append('price', dto.price.toString());
  formData.append('quantity', dto.quantity.toString());
  formData.append('description', dto.description || '');

  if (dto.image) {
    formData.append('image', dto.image, dto.image.name);
  }

  return formData;
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminProducts implements OnInit, OnDestroy {
  products: ProductModel[] = [];
  filteredProducts: ProductModel[] = [];

  loading = true;
  error = false;
  searchQuery = '';

  // Modal & Form State
  isModalOpen = false;
  isEditMode = false;
  submitting = false;

  // Active form data
  editingProductId: string | null = null;
  formDto: CreateProductDto = this.getEmptyDto();
  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;

  deletingProductId: string | null = null;

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly productService: ProductService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.error = false;

    const sub = this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[AdminProducts] Failed to load products:', err);
        this.loading = false;
        this.error = true;
        this.cdr.markForCheck();
      }
    });

    this.subscriptions.add(sub);
  }

  applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredProducts = [...this.products];
      return;
    }

    const q = this.searchQuery.toLowerCase().trim();
    this.filteredProducts = this.products.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile = file;
      this.formDto.image = file;

      // Local preview generator
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.editingProductId = null;
    this.formDto = this.getEmptyDto();
    this.clearFileSelection();
    this.isModalOpen = true;
  }

  openEditModal(product: ProductModel): void {
    this.isEditMode = true;
    this.editingProductId = product.id;
    this.formDto = {
      title: product.title,
      price: product.price,
      quantity: product.quantity ?? 0,
      description: product.description ?? '',
      image: null
    };
    this.clearFileSelection();
    this.imagePreviewUrl = product.url || null;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingProductId = null;
    this.formDto = this.getEmptyDto();
    this.clearFileSelection();
  }

  saveProduct(): void {
    if (!this.formDto.title || this.formDto.price == null) {
      return;
    }

    this.submitting = true;
    const formData = toProductFormData(this.formDto);

    if (this.isEditMode && this.editingProductId) {
      const sub = this.productService.updateProduct(this.editingProductId, formData).subscribe({
        next: () => {
          this.submitting = false;
          this.closeModal();
          this.loadProducts();
        },
        error: (err) => {
          console.error('[AdminProducts] Error updating product:', err);
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
      this.subscriptions.add(sub);
    } else {
      const sub = this.productService.createProduct(formData).subscribe({
        next: () => {
          this.submitting = false;
          this.closeModal();
          this.loadProducts();
        },
        error: (err) => {
          console.error('[AdminProducts] Error creating product:', err);
          this.submitting = false;
          this.cdr.markForCheck();
        }
      });
      this.subscriptions.add(sub);
    }
  }

  deleteProduct(id: string): void {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    this.deletingProductId = id;

    const sub = this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.products = this.products.filter(p => p.id !== id);
        this.applyFilter();
        this.deletingProductId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[AdminProducts] Error deleting product:', err);
        this.deletingProductId = null;
        this.cdr.markForCheck();
      }
    });

    this.subscriptions.add(sub);
  }

  private clearFileSelection(): void {
    this.selectedFile = null;
    this.imagePreviewUrl = null;
  }

  private getEmptyDto(): CreateProductDto {
    return {
      title: '',
      price: 0,
      quantity: 0,
      description: '',
      image: null
    };
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}