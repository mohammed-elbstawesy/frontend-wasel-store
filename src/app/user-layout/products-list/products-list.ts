import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
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
import { Category, SubCategory } from '../../core/models/category.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, ImgUrlPipe, FallbackImageDirective, FormsModule],
  templateUrl: './products-list.html',
  styleUrl: './products-list.css',
})
export class ProductsList implements OnInit {
  ts = inject(TranslationService);
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  cartService = inject(CartService);
  wishlistService = inject(WishlistService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  category: Category | undefined;
  products: Product[] = [];
  filteredProducts: Product[] = [];
  activeSubCat: string = 'all';
  sortBy: string = 'newest';
  searchQuery: string = '';

  ngOnInit() {
    this.route.params.subscribe(params => {
      const catId = params['catId'];
      const subCatId = params['subCatId'];

      this.categoryService.getCategoryById(catId).subscribe(cat => {
        this.category = cat;
      });

      this.productService.getProductsByCategory(catId).subscribe(products => {
        this.products = products;
        if (subCatId) {
          this.activeSubCat = subCatId;
          this.filteredProducts = products.filter(p => p.subCategory === subCatId);
        } else {
          this.filteredProducts = products;
        }
        this.applySorting();
      });
    });
  }

  filterBySubCategory(subCatId: string) {
    this.activeSubCat = subCatId;
    this.applyAllFilters();
  }

  onSortChange(event: any) {
    this.sortBy = event.target.value;
    this.applySorting();
  }

  applySorting() {
    switch (this.sortBy) {
      case 'price_low':
        this.filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        this.filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
      default:
        this.filteredProducts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }

  onSearchChange() {
    this.applyAllFilters();
  }

  applyAllFilters() {
    let result = [...this.products];

    // Hide fully out-of-stock products unless searching
    const isSearching = this.searchQuery.trim().length > 0;
    if (!isSearching) {
      result = result.filter(p => p.stock > 0);
    }

    // Filter by subcategory
    if (this.activeSubCat !== 'all') {
      result = result.filter(p => p.subCategory === this.activeSubCat);
    }
    // Filter by search
    if (isSearching) {
      const query = this.searchQuery.trim().toLowerCase();
      result = result.filter(p =>
        p.name.en.toLowerCase().includes(query) ||
        p.name.ar.includes(this.searchQuery.trim())
      );
    }
    this.filteredProducts = result;
    this.applySorting();
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

  getDiscountedPrice(price: number, discountPercentage: number | undefined): number {
    if (!discountPercentage) return price;
    return price * (1 - (discountPercentage / 100));
  }
}
