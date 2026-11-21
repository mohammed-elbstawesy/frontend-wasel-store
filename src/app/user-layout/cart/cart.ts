import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FallbackImageDirective } from '../../shared/directives/fallback-image.directive';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ImgUrlPipe } from '../../shared/pipes/img-url.pipe';
import { CartService } from '../../core/services/cart.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, ImgUrlPipe, FallbackImageDirective],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  ts = inject(TranslationService);
  cartService = inject(CartService);
  confirmService = inject(ConfirmService);
  toastService = inject(ToastService);
  authService = inject(AuthService);

  increaseQty(productId: string, sizeLabel: string | undefined, currentQty: number) {
    const success = this.cartService.updateQuantity(productId, sizeLabel, currentQty + 1);
    if (!success) {
      this.toastService.show(
        this.ts.currentLang() === 'ar'
          ? 'لا يمكن زيادة الكمية — المخزون غير كافي'
          : 'Cannot increase quantity — insufficient stock',
        'error'
      );
    }
  }

  decreaseQty(productId: string, sizeLabel: string | undefined, currentQty: number) {
    if (currentQty > 1) {
      this.cartService.updateQuantity(productId, sizeLabel, currentQty - 1);
    }
  }

  removeItem(productId: string, sizeLabel: string | undefined) {
    this.cartService.removeFromCart(productId, sizeLabel);
  }

  async clearCart() {
    const confirmed = await this.confirmService.ask(
      this.ts.currentLang() === 'ar' ? 'هل أنت متأكد من تفريغ السلة؟' : 'Are you sure you want to clear the cart?',
      'warning'
    );
    if (confirmed) this.cartService.clearCart();
  }

  formatPrice(price: number): string {
    return price.toLocaleString();
  }
}

