import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Product } from '../models/product.model';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';
import { TranslationService } from './translation.service';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly storageKey = 'wasel_wishlist';
  private platformId = inject(PLATFORM_ID);
  private _http = inject(HttpClient);
  private _router = inject(Router);
  private toastService = inject(ToastService);
  private ts = inject(TranslationService);
  private wishlistSubject = new BehaviorSubject<Product[]>([]);

  wishlist$ = this.wishlistSubject.asObservable();

  constructor() {
    // On app start, just load local data (no merge)
    const local = this.loadWishlistLocally();
    this.wishlistSubject.next(local);
  }

  private isLogin(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return !!localStorage.getItem('token');
  }

  private loadWishlistLocally(): Product[] {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const saved = localStorage.getItem(this.storageKey);
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    }
    return [];
  }

  private saveLocally(items: Product[]) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    }
  }

  private save(items: Product[]) {
    this.wishlistSubject.next(items);
    this.saveLocally(items);
    if (this.isLogin()) {
      this.syncToBackend(items);
    }
  }

  private async syncToBackend(items: Product[]) {
    const productIds = items.map(p => typeof p === 'object' ? p._id : p);
    try {
      await firstValueFrom(this._http.post(`${environment.apiUrl}wishlist/sync`, { items: productIds }));
    } catch (e) {
      console.error('Failed to sync wishlist', e);
    }
  }

  private mergeWishlists(backendItems: Product[], localItems: Product[]): Product[] {
    const merged = [...backendItems];
    localItems.forEach(localItem => {
      const id = (localItem as any)._id || localItem;
      const exists = merged.some(i => ((i as any)._id || i) === id);
      if (!exists) {
        merged.push(localItem);
      }
    });
    return merged;
  }

  getItems(): Product[] {
    return this.wishlistSubject.value;
  }

  isInWishlist(productId: string): boolean {
    return this.wishlistSubject.value.some(p => p._id === productId);
  }

  toggle(product: Product): boolean {
    if (!this.isLogin()) {
      this.toastService.show(
        this.ts.currentLang() === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first',
        'info'
      );
      this._router.navigate(['/login'], { queryParams: { returnUrl: this._router.url } });
      return false;
    }

    const items = [...this.wishlistSubject.value];
    const idx = items.findIndex(p => p._id === product._id);
    if (idx > -1) {
      items.splice(idx, 1);
      this.save(items);
      return false; // removed
    } else {
      items.push(product);
      this.save(items);
      return true; // added
    }
  }

  remove(productId: string) {
    const items = this.wishlistSubject.value.filter(p => p._id !== productId);
    this.save(items);
  }

  get count(): number {
    return this.wishlistSubject.value.length;
  }

  clearLocalWishlistStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.storageKey);
    }
  }

  /**
   * Called on login. Takes any guest items that were added before login,
   * clears local storage, fetches backend wishlist, merges guest items in,
   * then saves the merged result.
   */
  async mergeAndLoadWishlistOnLogin() {
    // 1. Snapshot guest items BEFORE clearing
    const guestItems = this.loadWishlistLocally();

    // 2. Clear local storage so old user data doesn't bleed
    this.clearLocalWishlistStorage();

    try {
      const res = await firstValueFrom(this._http.get<{ wishlist: any }>(`${environment.apiUrl}wishlist`));
      let backendItems: Product[] = res.wishlist?.items || [];

      // 3. If there were guest items (added while not logged in), merge them
      if (guestItems.length > 0) {
        backendItems = this.mergeWishlists(backendItems, guestItems);
        await this.syncToBackend(backendItems);
      }

      this.wishlistSubject.next(backendItems);
      this.saveLocally(backendItems);
    } catch (err) {
      // If backend fails, at least show guest items
      this.wishlistSubject.next(guestItems);
      this.saveLocally(guestItems);
    }
  }

  resetWishlist() {
    this.wishlistSubject.next([]);
    this.clearLocalWishlistStorage();
  }
}
