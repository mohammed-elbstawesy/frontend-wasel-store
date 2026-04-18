import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { CartItem } from '../models/cart.model';
import { Product, ProductSize } from '../models/product.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CartService {
  private _http = inject(HttpClient);

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
        let backendCart = res.cart?.items || [];

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

  addToCart(product: Product, selectedSize?: ProductSize, quantity: number = 1): boolean {
    const items = [...this.cartSubject.value];
    const existingIndex = items.findIndex(
      i => i.product._id === product._id && i.selectedSize?.label === selectedSize?.label
    );

    const currentQty = existingIndex > -1 ? items[existingIndex].quantity : 0;
    const newTotalQty = currentQty + quantity;

    // Per-size stock check: use size stock if available, otherwise product stock
    const maxStock = (selectedSize && selectedSize.stock !== undefined)
      ? selectedSize.stock
      : product.stock;

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

    // Per-size stock check
    const maxStock = (item.selectedSize && item.selectedSize.stock !== undefined)
      ? item.selectedSize.stock
      : item.product.stock;

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
        merged[index].quantity += localItem.quantity;
      } else {
        merged.push(localItem);
      }
    });
    return merged;
  }
}
