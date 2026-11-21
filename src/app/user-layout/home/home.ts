import { Component, inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ImgUrlPipe } from '../../shared/pipes/img-url.pipe';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { WishlistService } from '../../core/services/wishlist.service';
import { ToastService } from '../../core/services/toast.service';
import { FallbackImageDirective } from '../../shared/directives/fallback-image.directive';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../core/services/socket.service';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, ImgUrlPipe, FallbackImageDirective, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  ts = inject(TranslationService);
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  cartService = inject(CartService);
  wishlistService = inject(WishlistService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  platformId = inject(PLATFORM_ID);
  router = inject(Router);
  socketService = inject(SocketService);
  
  private subs: Subscription[] = [];

  categories: Category[] = [];
  products: Product[] = [];
  allProducts: Product[] = []; // Includes out-of-stock — used for search only
  searchQuery: string = '';

  // Slider state
  currentSlide = 0;
  private sliderInterval: any;
  sliderProducts: Product[] = [];

  ngOnInit() {
    this.categoryService.getCategories().subscribe(cats => this.categories = cats);
    this.productService.getProducts().subscribe(prods => {
      this.products = prods;
      
      // Calculate slider deals
      const discounted = this.products.filter(p => p.discountPercentage && p.discountPercentage > 0);
      for (let i = discounted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [discounted[i], discounted[j]] = [discounted[j], discounted[i]];
      }
      this.sliderProducts = discounted.slice(0, 10);
      
      
      this.startSliderAutoPlay();
    });
    // Load full product list for search (includes out-of-stock)
    this.productService.searchProducts().subscribe(prods => {
      this.allProducts = prods;
    });

    // Real-time stock updates
    this.subs.push(
      this.socketService.listen('stock_updated').subscribe(() => {
        // Refresh products and search cache
        this.productService.getProducts().subscribe(prods => {
          this.products = prods;
          const discounted = this.products.filter(p => p.discountPercentage && p.discountPercentage > 0);
          for (let i = discounted.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [discounted[i], discounted[j]] = [discounted[j], discounted[i]];
          }
          this.sliderProducts = discounted.slice(0, 10);
        });
        this.productService.searchProducts().subscribe(prods => {
          this.allProducts = prods;
        });
      })
    );
  }

  ngOnDestroy() {
    this.stopSliderAutoPlay();
    this.subs.forEach(s => s.unsubscribe());
  }

  get topSellingProducts() {
    return this.products.filter(p => p.isTopSelling && p.stock > 0).slice(0, 8);
  }

  get discountedProducts() {
    return this.products.filter(p => p.discountPercentage && p.discountPercentage > 0 && p.stock > 0).slice(0, 8);
  }

  // Removed the getter for sliderProducts since it's now a property
  get searchResults(): Product[] {
    if (!this.searchQuery.trim()) return [];
    const query = this.searchQuery.trim().toLowerCase();
    return this.allProducts.filter(p =>
      p.name.en.toLowerCase().includes(query) ||
      p.name.ar.includes(this.searchQuery.trim())
    ).slice(0, 12);
  }

  // Slider controls
  nextSlide() {
    if (this.sliderProducts.length === 0) return;
    this.currentSlide = (this.currentSlide + 1) % this.sliderProducts.length;
    this.restartAutoPlay();
  }

  prevSlide() {
    if (this.sliderProducts.length === 0) return;
    this.currentSlide = (this.currentSlide - 1 + this.sliderProducts.length) % this.sliderProducts.length;
    this.restartAutoPlay();
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    this.restartAutoPlay();
  }

  private startSliderAutoPlay() {
    if (isPlatformBrowser(this.platformId) && this.sliderProducts.length > 1) {
      this.sliderInterval = setInterval(() => {
        this.currentSlide = (this.currentSlide + 1) % this.sliderProducts.length;
      }, 5000);
    }
  }

  private stopSliderAutoPlay() {
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
      this.sliderInterval = null;
    }
  }

  private restartAutoPlay() {
    this.stopSliderAutoPlay();
    this.startSliderAutoPlay();
  }

  getDiscountedPrice(price: number, discountPercentage: number | undefined): number {
    if (!discountPercentage) return price;
    return price * (1 - (discountPercentage / 100));
  }

  /** Returns first in-stock size, or first size if all are out */
  getAvailableSize(product: Product) {
    if (!product.sizes || product.sizes.length === 0) return null;
    return product.sizes.find(s => s.stock === undefined || s.stock > 0) || product.sizes[0];
  }

  /** Returns the price of the first available size, or product price */
  getDisplayPrice(product: Product): number {
    const size = this.getAvailableSize(product);
    return size ? size.price : product.price;
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
    const added = this.cartService.addToCart(product, defaultSize, 1);
    if (added) {
      this.toastService.show(
        this.ts.currentLang() === 'ar'
          ? `تمت إضافة "${this.ts.localize(product.name)}" للسلة`
          : `"${this.ts.localize(product.name)}" added to cart`,
        'success'
      );
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

  goToProduct(id: string) {
    this.router.navigate(['/product', id]);
  }

  formatPrice(price: number): string {
    return price.toLocaleString();
  }
}