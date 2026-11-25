import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { CartItem } from '../models/cart.model';
import { Product, ProductSize } from '../models/product.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';
import { TranslationService } from './translation.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  private _http = inject(HttpClient);
  private _router = inject(Router);
  private toastService = inject(ToastService);
  private ts = inject(TranslationService);

  private cartKey = 'ecommerce_cart';
  private cartSubject = new BehaviorSubject<CartItem[]>([]);

  cart$ = this.cartSubject.asObservable();

  constructor() {
    this.initializeCart();
  }

  private async initializeCart() {
    const localCart = this.loadCartLocally();
    if (this.isLogin()) {
      try {
        const res = await firstValueFrom(this._http.get<{ cart: any }>(`${environment.apiUrl}cart`));
        let backendCart: CartItem[] = (res.cart?.items || []).filter((i: any) => i && i.product);

        if (localCart.length > 0) {
          backendCart = this.mergeCarts(backendCart, localCart);
          await this.syncToBackend(backendCart);
        }

        this.cartSubject.next(backendCart);
        localStorage.setItem(this.cartKey, JSON.stringify(backendCart));
      } catch (err) {
        this.cartSubject.next(localCart);
      }
    } else {
      this.cartSubject.next(localCart);
    }
  }

  clearLocalCartStorage(): void {
    localStorage.removeItem(this.cartKey);
  }

  resetCart(): void {
    this.clearLocalCartStorage();
    this.cartSubject.next([]);
  }

  private isLogin(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  get cartCount(): number {
    return this.cartSubject.value.length;
  }

  get cartTotal(): number {
    return this.cartSubject.value.reduce((sum, item) => {
      const basePrice = item.selectedSize ? item.selectedSize.price : item.product.price;
      const price = item.product.discountPercentage
        ? basePrice * (1 - (item.product.discountPercentage / 100))
        : basePrice;
      return sum + price * item.quantity;
    }, 0);
  }

  getItems(): CartItem[] {
    return this.cartSubject.value;
  }

  /**
   * Resolves effective stock for a product/size pair using live product.sizes stock
   * first (since backend cart only persists label & price), falling back to selectedSize.stock or product.stock.
   */
  getEffectiveStock(product: Product, selectedSize?: ProductSize): number {
    if (!product) return 0;
    if (selectedSize?.label && product.sizes && product.sizes.length > 0) {
      const liveSize = product.sizes.find(s => s.label === selectedSize.label);
      if (liveSize && liveSize.stock !== undefined) {
        return liveSize.stock;
      }
    }
    if (selectedSize && selectedSize.stock !== undefined) {
      return selectedSize.stock;
    }
    return product.stock ?? 0;
  }

  getItemMaxStock(item: CartItem): number {
    return this.getEffectiveStock(item.product, item.selectedSize);
  }

  addToCart(product: Product, selectedSize?: ProductSize, quantity: number = 1): boolean {
    if (!this.isLogin()) {
      this.toastService.show(
        this.ts.currentLang() === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first',
        'info'
      );
      this._router.navigate(['/login'], { queryParams: { returnUrl: this._router.url } });
      return false;
    }

    const items = [...this.cartSubject.value];
    const existingIndex = items.findIndex(
      i => i.product._id === product._id && i.selectedSize?.label === selectedSize?.label
    );

    const currentQty = existingIndex > -1 ? items[existingIndex].quantity : 0;
    const newTotalQty = currentQty + quantity;

    const maxStock = this.getEffectiveStock(product, selectedSize);

    if (newTotalQty > maxStock) {
      return false;
    }

    if (existingIndex > -1) {
      items[existingIndex] = { ...items[existingIndex], quantity: newTotalQty };
    } else {
      items.push({ product, selectedSize, quantity });
    }

    this.updateCart(items);
    return true;
  }

  removeFromCart(productId: string, sizeLabel?: string): void {
    const items = this.cartSubject.value.filter(
      i => !(i.product._id === productId && i.selectedSize?.label === sizeLabel)
    );
    this.updateCart(items);
  }

  updateQuantity(productId: string, sizeLabel: string | undefined, quantity: number): boolean {
    if (quantity < 1) return false;

    const item = this.cartSubject.value.find(
      i => i.product._id === productId && i.selectedSize?.label === sizeLabel
    );
    if (!item) return false;

    const maxStock = this.getItemMaxStock(item);

    if (quantity > maxStock) {
      return false;
    }

    const items = this.cartSubject.value.map(i => {
      if (i.product._id === productId && i.selectedSize?.label === sizeLabel) {
        return { ...i, quantity };
      }
      return i;
    });
    this.updateCart(items);
    return true;
  }

  clearCart(): void {
    this.updateCart([]);
  }

  private updateCart(items: CartItem[]): void {
    this.cartSubject.next(items);
    localStorage.setItem(this.cartKey, JSON.stringify(items));
    if (this.isLogin()) {
      this.syncToBackend(items);
    }
  }

  private loadCartLocally(): CartItem[] {
    try {
      const saved = localStorage.getItem(this.cartKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  private async syncToBackend(items: CartItem[]) {
    const payload = items.map(i => ({
      product: typeof i.product === 'object' ? i.product._id : i.product,
      selectedSize: i.selectedSize,
      quantity: i.quantity
    }));
    try {
      await firstValueFrom(this._http.post(`${environment.apiUrl}cart/sync`, { items: payload }));
    } catch (e) {
      console.error('Failed to sync cart', e);
    }
  }

  async mergeAndLoadCartOnLogin() {
    await this.initializeCart();
  }

  private mergeCarts(backendCart: CartItem[], localCart: CartItem[]): CartItem[] {
    let merged = [...backendCart];
    localCart.forEach(localItem => {
      const index = merged.findIndex(
        i => {
          const pid1 = (i.product as any)._id || i.product;
          const pid2 = (localItem.product as any)._id || localItem.product;
          return pid1 === pid2 && i.selectedSize?.label === localItem.selectedSize?.label;
        }
      );
      if (index > -1) {
        const maxStock = this.getItemMaxStock(merged[index]);
        merged[index].quantity = Math.min(maxStock || Infinity, merged[index].quantity + localItem.quantity);
      } else {
        merged.push(localItem);
      }
    });
    return merged;
  }
}
