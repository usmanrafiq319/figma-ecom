import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductModel } from '../models/product-model';
import { CreateProductDto, toProductFormData } from '../models/create-product-dto-module';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly apiUrl = `${environment.apiUrl}/api/product`; // Replace with your endpoint URL

  constructor(private readonly http: HttpClient) {}

  getProducts(): Observable<ProductModel[]> {
    return this.http.get<ProductModel[]>(this.apiUrl);
  }

  getProduct(id: string): Observable<ProductModel> {
    return this.http.get<ProductModel>(`${this.apiUrl}/${id}`);
  }

  // Accept FormData directly instead of CreateProductDto
  createProduct(data: FormData): Observable<ProductModel> {
    return this.http.post<ProductModel>(this.apiUrl, data);
  }

  // Accept FormData for updates as well
  updateProduct(id: string, data: FormData): Observable<ProductModel> {
    return this.http.put<ProductModel>(`${this.apiUrl}/${id}`, data);
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}