import { HttpClient, provideHttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ProductModel } from '../models/product-model';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
 private http = inject(HttpClient)
  private readonly productUrl = `${environment.apiUrl}/api/product`;

  getProducts(){
    return this.http.get<ProductModel[]>(this.productUrl).pipe(
      // 2. Slice the array to return only indexes 0 to 3
      map((products: ProductModel[]) => products.slice(0, 4)) 
    );
  }

  getProduct(id: string){
    return this.http.get<ProductModel>(`${this.productUrl}/${id}`)
  }

}
