import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
export class OurProducts implements OnInit {
  ts = inject(TranslationService);
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  cartService = inject(CartService);
  wishlistService = inject(WishlistService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  allProducts: Product[] = [];
  categories: Category[] = [];
  
  searchQuery = '';
  selectedCategory = '';
  selectedSubCategory = '';
  sortBy = 'name';
  priceMin = 0;
  priceMax = 100000;
  maxPrice = 100000;
  viewMode: 'grid' | 'list' = 'grid';
  discountOnly = false;

  ngOnInit() {
    this.productService.getProducts().subscribe(prods => {
      this.allProducts = prods;
      if (prods.length > 0) {
        const prices = prods.flatMap(p => p.sizes?.length ? p.sizes.map(s => s.price) : [p.price]);
        this.maxPrice = Math.ceil(Math.max(...prices) / 100) * 100;
        this.priceMax = this.maxPrice;
      }
    });
    this.categoryService.getCategories().subscribe(cats => this.categories = cats);

    // Check for discount filter from query params
    this.route.queryParams.subscribe(params => {
      if (params['filter'] === 'discounts') {
        this.discountOnly = true;
      }
    });
  }

  get subCategories(): SubCategory[] {
    if (!this.selectedCategory) return [];
    const cat = this.categories.find(c => c._id === this.selectedCategory);
    return cat?.subCategories || [];
  }

  onCategoryChange() {
    this.selectedSubCategory = '';
  }

  get filteredProducts(): Product[] {
    let result = [...this.allProducts];

    // Hide fully out-of-stock products unless searching
    const isSearching = this.searchQuery.trim().length > 0;
    if (!isSearching) {
      result = result.filter(p => p.stock > 0);
    }

    // Search
    if (isSearching) {
      const q = this.searchQuery.trim().toLowerCase();
      result = result.filter(p =>
        p.name.en.toLowerCase().includes(q) ||
        p.name.ar.includes(this.searchQuery.trim())
      );
    }

    // Category (category can be a populated object or a string ID)
    if (this.selectedCategory) {
      result = result.filter(p => {
        const catId = typeof p.category === 'object' ? (p.category as any)._id : p.category;
        return catId === this.selectedCategory;
      });
    }

    // SubCategory
    if (this.selectedSubCategory) {
      result = result.filter(p => p.subCategory === this.selectedSubCategory);
    }

    // Price range
    result = result.filter(p => {
      const minPrice = p.sizes?.length ? Math.min(...p.sizes.map(s => s.price)) : p.price;
      return minPrice >= this.priceMin && minPrice <= this.priceMax;
    });

    // Discount filter
    if (this.discountOnly) {
      result = result.filter(p => p.discountPercentage && p.discountPercentage > 0);
    }

    // Sort
    if (this.sortBy === 'name') {
      result.sort((a, b) => {
        const nameA = this.ts.currentLang() === 'ar' ? a.name.ar : a.name.en;
        const nameB = this.ts.currentLang() === 'ar' ? b.name.ar : b.name.en;
        return nameA.localeCompare(nameB);
      });
    } else if (this.sortBy === 'price-low') {
      result.sort((a, b) => {
        const pA = a.sizes?.length ? a.sizes[0].price : a.price;
        const pB = b.sizes?.length ? b.sizes[0].price : b.price;
        return pA - pB;
      });
    } else if (this.sortBy === 'price-high') {
      result.sort((a, b) => {
        const pA = a.sizes?.length ? a.sizes[0].price : a.price;
        const pB = b.sizes?.length ? b.sizes[0].price : b.price;
        return pB - pA;
      });
    } else if (this.sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }

  getCategoryName(catId: string): string {
    const cat = this.categories.find(c => c._id === catId);
    if (!cat) return '';
    return this.ts.localize(cat.name);
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
  }
}
