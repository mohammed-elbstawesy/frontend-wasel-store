import { Component, ElementRef, inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { TranslationService } from '../../core/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ImgUrlPipe } from '../../shared/pipes/img-url.pipe';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../core/models/product.model';
import { Category, SubCategory } from '../../core/models/category.model';
import { FallbackImageDirective } from '../../shared/directives/fallback-image.directive';

@Component({
  selector: 'app-our-products',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslatePipe, ImgUrlPipe, FallbackImageDirective],
  templateUrl: './our-products.html',
  styleUrl: './our-products.css',
})
export class OurProducts implements OnInit, OnDestroy {
  ts = inject(TranslationService);
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  cartService = inject(CartService);
  wishlistService = inject(WishlistService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  products: Product[] = [];
  categories: Category[] = [];

  searchQuery = '';
  selectedCategory = '';
  selectedSubCategory = '';
  sortBy = 'name';
  priceMin = 0;
  priceMax = 5000;
  maxPrice = 5000;
  viewMode: 'grid' | 'list' = 'grid';
  discountOnly = false;

  // Lazy loading / Infinite Scroll state
  page = 1;
  readonly pageSize = 12;
  totalProducts = 0;
  hasMore = false;
  isLoading = false;
  isLoadingMore = false;

  private searchSubject = new Subject<string>();
  private priceSubject = new Subject<number>();
  private subs: Subscription[] = [];
  private activeLoadSub?: Subscription;
  private observer?: IntersectionObserver;

  @ViewChild('loadMoreSentinel')
  set sentinelRef(el: ElementRef<HTMLElement> | undefined) {
    this.setupObserver(el?.nativeElement);
  }

  ngOnInit() {
    this.categoryService.getCategories().subscribe(cats => this.categories = cats);

    this.subs.push(
      this.searchSubject.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
        this.resetAndLoad();
      })
    );

    this.subs.push(
      this.priceSubject.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => {
        this.resetAndLoad();
      })
    );

    this.route.queryParams.subscribe(params => {
      if (params['filter'] === 'discounts') {
        this.discountOnly = true;
      }
      this.resetAndLoad();
    });
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

  onSearchInput(val: string) {
    this.searchSubject.next(val);
  }

  onPriceSliderChange(val: number) {
    this.priceSubject.next(val);
  }

  onCategoryChange() {
    this.selectedSubCategory = '';
    this.resetAndLoad();
  }

  toggleDiscountOnly() {
    this.discountOnly = !this.discountOnly;
    this.resetAndLoad();
  }

  resetAndLoad() {
    this.page = 1;
    this.products = [];
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

    this.activeLoadSub = this.productService.getProductsPaginated({
      page: this.page,
      limit: this.pageSize,
      search: this.searchQuery,
      category: this.selectedCategory || undefined,
      subCategory: this.selectedSubCategory || undefined,
      sort: this.sortBy,
      discountOnly: this.discountOnly,
      maxPrice: this.priceMax < this.maxPrice ? this.priceMax : undefined,
      hideOutOfStock: true
    }).subscribe({
      next: (res) => {
        if (reset) {
          this.products = res.products || [];
        } else {
          const existingIds = new Set(this.products.map(p => p._id));
          const fresh = (res.products || []).filter(p => !existingIds.has(p._id));
          this.products = [...this.products, ...fresh];
        }
        this.totalProducts = res.total ?? this.products.length;
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

  get subCategories(): SubCategory[] {
    if (!this.selectedCategory) return [];
    const cat = this.categories.find(c => c._id === this.selectedCategory);
    return cat?.subCategories || [];
  }

  getDiscountedPrice(price: number, discount: number | undefined): number {
    if (!discount) return price;
    return price * (1 - discount / 100);
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

  resetFilters() {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.selectedSubCategory = '';
    this.sortBy = 'name';
    this.priceMin = 0;
    this.priceMax = this.maxPrice;
    this.discountOnly = false;
    this.resetAndLoad();
  }
}
