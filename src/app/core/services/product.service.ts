import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';

export interface PaginatedProductsResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subCategory?: string;
  sort?: string;
  discountOnly?: boolean;
  maxPrice?: number;
  minPrice?: number;
  hideOutOfStock?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = environment.apiUrl + 'products';

  constructor(private http: HttpClient) {}

  getProducts(query: string = ''): Observable<Product[]> {
    // For normal user views, hide out-of-stock
    const separator = query.includes('?') ? '&' : '?';
    return this.http.get<Product[]>(`${this.apiUrl}${query}${separator}hideOutOfStock=true`);
  }

  getProductsPaginated(params: ProductQueryParams = {}): Observable<PaginatedProductsResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 12));

    if (params.hideOutOfStock !== false) httpParams = httpParams.set('hideOutOfStock', 'true');
    if (params.search?.trim()) httpParams = httpParams.set('search', params.search.trim());
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.subCategory) httpParams = httpParams.set('subCategory', params.subCategory);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.discountOnly) httpParams = httpParams.set('discountOnly', 'true');
    if (params.maxPrice !== undefined && params.maxPrice < 100000) httpParams = httpParams.set('maxPrice', String(params.maxPrice));
    if (params.minPrice !== undefined && params.minPrice > 0) httpParams = httpParams.set('minPrice', String(params.minPrice));

    return this.http.get<PaginatedProductsResponse>(this.apiUrl, { params: httpParams });
  }

  getProductsByCategoryPaginated(catId: string, params: ProductQueryParams = {}): Observable<PaginatedProductsResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('limit', String(params.limit ?? 12));

    if (params.hideOutOfStock !== false) httpParams = httpParams.set('hideOutOfStock', 'true');
    if (params.search?.trim()) httpParams = httpParams.set('search', params.search.trim());
    if (params.subCategory && params.subCategory !== 'all') httpParams = httpParams.set('subCategory', params.subCategory);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);

    return this.http.get<PaginatedProductsResponse>(`${this.apiUrl}/category/${catId}`, { params: httpParams });
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

