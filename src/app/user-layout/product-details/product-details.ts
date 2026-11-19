import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ImgUrlPipe } from '../../shared/pipes/img-url.pipe';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { ToastService } from '../../core/services/toast.service';
import { FallbackImageDirective } from '../../shared/directives/fallback-image.directive';
import { Product, ProductSize } from '../../core/models/product.model';
import { SocketService } from '../../core/services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, ImgUrlPipe, FallbackImageDirective],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css',
})
export class ProductDetails implements OnInit {
  ts = inject(TranslationService);
  productService = inject(ProductService);
  cartService = inject(CartService);
  wishlistService = inject(WishlistService);
  toastService = inject(ToastService);
  route = inject(ActivatedRoute);
  socketService = inject(SocketService);

  product: Product | undefined;
  relatedProducts: Product[] = [];
  selectedSize: ProductSize | null = null;
  quantity = 1;

  private subs: Subscription[] = [];

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.quantity = 1; // Reset quantity on route change
        this.productService.getProductById(id).subscribe(p => {
          this.product = p;
          if (p) {
            if (p.sizes && p.sizes.length > 0) {
              const availableSize = p.sizes.find(s => s.stock !== undefined && s.stock > 0);
              this.selectedSize = availableSize || p.sizes[0];
            } else {
              this.selectedSize = null;
            }
            this.productService.getRelatedProducts(p.subCategory, p._id).subscribe(
              rel => this.relatedProducts = rel
            );
          }
        });
      }
    });

    this.subs.push(
      this.socketService.listen('stock_updated').subscribe(() => {
        if (this.product && this.product._id) {
          this.productService.getProductById(this.product._id).subscribe(p => {
             if (p) {
               this.product = p;
               // Re-select the same size from the updated product
               if (this.selectedSize && p.sizes) {
                 const updatedSize = p.sizes.find(s => s.label === this.selectedSize!.label);
                 if (updatedSize) this.selectedSize = updatedSize;
               }
               // Ensure quantity doesn't exceed the effective stock
               const max = this.effectiveStock;
               if (this.quantity > max) this.quantity = Math.max(1, max);
             }
          });
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  /** Returns the effective stock for the currently selected variant */
  get effectiveStock(): number {
    if (!this.product) return 0;
    if (this.selectedSize && this.selectedSize.stock !== undefined) {
      return this.selectedSize.stock;
    }
    return this.product.stock;
  }

  selectSize(size: ProductSize) {
    this.selectedSize = size;
    // Reset quantity if it exceeds the new size's stock
    if (this.quantity > this.effectiveStock) {
      this.quantity = Math.max(1, this.effectiveStock);
    }
  }

  increaseQty() { 
    if (!this.product) return;
    const max = this.effectiveStock;
    if (this.quantity < max) {
      this.quantity++; 
    } else {
      // User is trying to go beyond stock — show toast
      this.toastService.show(
        this.ts.currentLang() === 'ar'
          ? `عذراً، الكمية المتاحة ${max} فقط`
          : `Sorry, only ${max} available in stock`,
        'error'
      );
    }
  }
  decreaseQty() { if (this.quantity > 1) this.quantity--; }

  addToCart() {
    if (!this.product) return;
    if (this.product.sizes && this.product.sizes.length > 0 && !this.selectedSize) return;
    const max = this.effectiveStock;
    if (this.quantity > max) {
      this.toastService.show(
        this.ts.currentLang() === 'ar'
          ? `الكمية المطلوبة غير متاحة. المتاح: ${max}`
          : `Requested quantity not available. Available: ${max}`,
        'error'
      );
      return;
    }
    const added = this.cartService.addToCart(this.product, this.selectedSize || undefined, this.quantity);
    if (!added) {
      this.toastService.show(
        this.ts.currentLang() === 'ar'
          ? `الكمية المطلوبة تتخطى المخزون المتاح (${max})`
          : `Quantity exceeds available stock (${max})`,
        'error'
      );
      return;
    }
    this.toastService.show(
      this.ts.currentLang() === 'ar'
        ? `تمت إضافة "${this.ts.localize(this.product.name)}" للسلة`
        : `"${this.ts.localize(this.product.name)}" added to cart`,
      'success'
    );
  }

  toggleWishlist(product: Product) {
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

  getAvailableSize(product: Product) {
    if (!product.sizes || product.sizes.length === 0) return null;
    return product.sizes.find(s => s.stock === undefined || s.stock > 0) || product.sizes[0];
  }

  getDisplayPrice(product: Product): number {
    const size = this.getAvailableSize(product);
    return size ? size.price : product.price;
  }



  addRelatedToCart(product: Product) {
    if (product.stock <= 0) return;
    const added = this.cartService.addToCart(product, this.getAvailableSize(product) || undefined, 1);
    if (!added) {
      this.toastService.show(
        this.ts.currentLang() === 'ar'
          ? 'الكمية في السلة وصلت للحد الأقصى المتاح'
          : 'Cart quantity reached maximum available stock',
        'error'
      );
      return;
    }
    this.toastService.show(
      this.ts.currentLang() === 'ar'
        ? `تمت إضافة "${this.ts.localize(product.name)}" للسلة`
        : `"${this.ts.localize(product.name)}" added to cart`,
      'success'
    );
  }
}
