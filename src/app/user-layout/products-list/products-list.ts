import { Component, ElementRef, inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { TranslationService } from '../../core/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ImgUrlPipe } from '../../shared/pipes/img-url.pipe';
import { FallbackImageDirective } from '../../shared/directives/fallback-image.directive';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, ImgUrlPipe, FallbackImageDirective, FormsModule],
  templateUrl: './products-list.html',
  styleUrl: './products-list.css',
})
export class ProductsList implements OnInit, OnDestroy {
  ts = inject(TranslationService);
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  cartService = inject(CartService);
  wishlistService = inject(WishlistService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  router = inject(Router);
  route = inject(ActivatedRoute);

  category: Category | undefined;
  catId = '';
  filteredProducts: Product[] = [];
  activeSubCat: string = 'all';
  sortBy: string = 'newest';
  searchQuery: string = '';

  // Lazy loading / Infinite scroll
  page = 1;
  readonly pageSize = 12;
  hasMore = false;
  isLoading = false;
  isLoadingMore = false;

  private searchSubject = new Subject<string>();
  private subs: Subscription[] = [];
  private activeLoadSub?: Subscription;
  private observer?: IntersectionObserver;

  @ViewChild('loadMoreSentinel')
  set sentinelRef(el: ElementRef<HTMLElement> | undefined) {
    this.setupObserver(el?.nativeElement);
  }

  ngOnInit() {
    this.subs.push(
      this.searchSubject.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
        this.resetAndLoad();
      })
    );

    this.subs.push(
      this.route.params.subscribe(params => {
        this.catId = params['catId'];
        const subCatId = params['subCatId'];
        this.activeSubCat = subCatId || 'all';

        this.categoryService.getCategoryById(this.catId).subscribe(cat => {
          this.category = cat;
        });

        this.resetAndLoad();
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.activeLoadSub?.unsubscribe();
    this.observer?.disconnect();
  }

  private setupObserver(el?: HTMLElement) {
    this.observer?.disconnect();
    if (!el || !isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && this.hasMore && !this.isLoading && !this.isLoadingMore) {
          this.loadNextPage();
        }
      },
      { rootMargin: '250px' }
    );
    this.observer.observe(el);
  }

  filterBySubCategory(subCatId: string) {
    this.activeSubCat = subCatId;
    this.resetAndLoad();
  }

  onSortChange(event: any) {
    this.sortBy = event.target.value;
    this.resetAndLoad();
  }

  onSearchChange() {
    this.searchSubject.next(this.searchQuery);
  }

  resetAndLoad() {
    if (!this.catId) return;
    this.page = 1;
    this.filteredProducts = [];
    this.hasMore = false;
    this.fetchPage(true);
  }

  loadNextPage() {
    if (!this.hasMore || this.isLoading || this.isLoadingMore) return;
    this.page += 1;
    this.fetchPage(false);
  }

  private fetchPage(reset: boolean) {
    this.activeLoadSub?.unsubscribe();
    if (reset) {
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }

    this.activeLoadSub = this.productService.getProductsByCategoryPaginated(this.catId, {
      page: this.page,
      limit: this.pageSize,
      subCategory: this.activeSubCat,
      search: this.searchQuery,
      sort: this.sortBy,
      hideOutOfStock: true
    }).subscribe({
      next: (res) => {
        if (reset) {
          this.filteredProducts = res.products || [];
        } else {
          const existingIds = new Set(this.filteredProducts.map(p => p._id));
          const fresh = (res.products || []).filter(p => !existingIds.has(p._id));
          this.filteredProducts = [...this.filteredProducts, ...fresh];
        }
        this.hasMore = !!res.hasMore;
        this.isLoading = false;
        this.isLoadingMore = false;
      },
      error: () => {
        this.isLoading = false;
        this.isLoadingMore = false;
      }
    });
  }

  /** Returns first in-stock size, or first size if all are out */
  getAvailableSize(product: Product) {
    if (!product.sizes || product.sizes.length === 0) return null;
    return product.sizes.find(s => s.stock === undefined || s.stock > 0) || product.sizes[0];
  }

  getDisplayPrice(product: Product): number {
    const size = this.getAvailableSize(product);
    return size ? size.price : product.price;
  }

  getQuickMaxStock(product: Product): number {
    const size = this.getAvailableSize(product) || undefined;
    return this.cartService.getEffectiveStock(product, size);
  }

  getInCartQty(product: Product): number {
    const size = this.getAvailableSize(product) || undefined;
    const item = this.cartService.getItems().find(
      i => i.product._id === product._id && i.selectedSize?.label === size?.label
    );
    return item ? item.quantity : 0;
  }

  addToCart(product: Product) {
    if (!this.authService.isLogin()) {
      this.toastService.show(
        this.ts.currentLang() === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first',
        'info'
      );
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    const defaultSize = this.getAvailableSize(product) || undefined;
    const maxStock = this.cartService.getEffectiveStock(product, defaultSize);
    const added = this.cartService.addToCart(product, defaultSize, 1);
    if (added) {
      this.toastService.show(
        this.ts.currentLang() === 'ar'
          ? `تمت إضافة "${this.ts.localize(product.name)}" للسلة`
          : `"${this.ts.localize(product.name)}" added to cart`,
        'success'
      );
    } else {
      this.toastService.show(
        this.ts.currentLang() === 'ar'
          ? `عذراً، الكمية المتاحة ${maxStock} فقط`
          : `Sorry, only ${maxStock} available in stock`,
        'error'
      );
    }
  }

  increaseQuickQty(product: Product) {
    if (!this.authService.isLogin()) {
      this.addToCart(product);
      return;
    }
    const defaultSize = this.getAvailableSize(product) || undefined;
    const currentQty = this.getInCartQty(product);
    const maxStock = this.cartService.getEffectiveStock(product, defaultSize);
    const ok = this.cartService.updateQuantity(product._id, defaultSize?.label, currentQty + 1);
    if (!ok) {
      this.toastService.show(
        this.ts.currentLang() === 'ar'
          ? `عذراً، الحد الأقصى المتاح ${maxStock} فقط`
          : `Sorry, max available stock is ${maxStock}`,
        'error'
      );
    }
  }

  decreaseQuickQty(product: Product) {
    const defaultSize = this.getAvailableSize(product) || undefined;
    const currentQty = this.getInCartQty(product);
    if (currentQty <= 1) {
      this.cartService.removeFromCart(product._id, defaultSize?.label);
    } else {
      this.cartService.updateQuantity(product._id, defaultSize?.label, currentQty - 1);
    }
  }

  toggleWishlist(product: Product) {
    if (!this.authService.isLogin()) {
      this.toastService.show(
        this.ts.currentLang() === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first',
        'info'
      );
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    const added = this.wishlistService.toggle(product);
    if (added) {
      this.toastService.show(
        this.ts.currentLang() === 'ar'
          ? `تمت إضافة "${this.ts.localize(product.name)}" للمفضلة`
          : `"${this.ts.localize(product.name)}" added to wishlist`,
        'success'
      );
    } else {
      this.toastService.show(
        this.ts.currentLang() === 'ar'
          ? `تمت إزالة "${this.ts.localize(product.name)}" من المفضلة`
          : `"${this.ts.localize(product.name)}" removed from wishlist`,
        'info'
      );
    }
  }

  formatPrice(price: number): string {
    return price.toLocaleString();
  }

  getDiscountedPrice(price: number, discountPercentage: number | undefined): number {
    if (!discountPercentage) return price;
    return price * (1 - (discountPercentage / 100));
  }
}
