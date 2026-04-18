import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = environment.apiUrl + 'products';

  constructor(private http: HttpClient) {}

  getProducts(query: string = ''): Observable<Product[]> {
    // For normal user views, hide out-of-stock
    const separator = query.includes('?') ? '&' : '?';
    return this.http.get<Product[]>(`${this.apiUrl}${query}${separator}hideOutOfStock=true`);
  }

  // Admin/Search: shows ALL products including out-of-stock
  getAdminProducts(query: string = ''): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}${query}`);
  }

  searchProducts(): Observable<Product[]> {
    return this.getAdminProducts();
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  getProductsByCategory(catId: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/category/${catId}?hideOutOfStock=true`);
  }

  getProductsBySubCategory(subCatId: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/subcategory/${subCatId}?hideOutOfStock=true`);
  }

  getRelatedProducts(subCatId: string, excludeId: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/subcategory/${subCatId}?hideOutOfStock=true`).pipe(
      map(products => products.filter(p => p._id !== excludeId))
    );
  }

  // Admin CRUD
  addProduct(data: FormData): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateProduct(id: string, data: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  updateStock(id: string, quantity: number, reason: string, sizeLabel?: string): Observable<any> {
    const body: any = { quantity, reason };
    if (sizeLabel) body.sizeLabel = sizeLabel;
    return this.http.patch(`${this.apiUrl}/${id}/stock`, body);
  }
}

