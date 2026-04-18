import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ImgUrlPipe } from '../../shared/pipes/img-url.pipe';
import { FallbackImageDirective } from '../../shared/directives/fallback-image.directive';
import { WishlistService } from '../../core/services/wishlist.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, ImgUrlPipe, FallbackImageDirective],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.css',
})
export class Wishlist {
  ts = inject(TranslationService);
  wishlistService = inject(WishlistService);
  cartService = inject(CartService);
  toastService = inject(ToastService);

  removeFromWishlist(product: Product) {
    this.wishlistService.remove(product._id);
    this.toastService.show(
      this.ts.currentLang() === 'ar'
        ? `تمت إزالة "${this.ts.localize(product.name)}" من المفضلة`
        : `"${this.ts.localize(product.name)}" removed from wishlist`,
      'info'
    );
  }

  addToCart(product: Product) {
    const defaultSize = this.getAvailableSize(product) || undefined;
    this.cartService.addToCart(product, defaultSize, 1);
    this.toastService.show(
      this.ts.currentLang() === 'ar'
        ? `تمت إضافة "${this.ts.localize(product.name)}" للسلة`
        : `"${this.ts.localize(product.name)}" added to cart`,
      'success'
    );
  }

  getAvailableSize(product: Product) {
    if (!product.sizes || product.sizes.length === 0) return null;
    return product.sizes.find(s => s.stock === undefined || s.stock > 0) || product.sizes[0];
  }

  getDisplayPrice(product: Product): number {
    const size = this.getAvailableSize(product);
    return size ? size.price : product.price;
  }

  getDiscountedPrice(price: number, discount: number | undefined): number {
    if (!discount) return price;
    return price * (1 - discount / 100);
  }

  formatPrice(price: number): string {
    return price.toLocaleString();
  }
}
