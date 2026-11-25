import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslationService } from '../core/services/translation.service';
import { TranslatePipe } from '../shared/pipes/translate.pipe';
import { ImgUrlPipe } from '../shared/pipes/img-url.pipe';
import { CartService } from '../core/services/cart.service';
import { OrderService } from '../core/services/order.service';
import { AuthService } from '../core/services/auth.service';
import { ToastService } from '../core/services/toast.service';
import { SettingsService, AppSettings } from '../core/services/settings.service';
import { CouponService, ValidateCouponResponse } from '../core/services/coupon.service';
import { FallbackImageDirective } from '../shared/directives/fallback-image.directive';
import { EGYPTIAN_GOVERNORATES } from '../core/models/users.model';
import { SocketService } from '../core/services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, TranslatePipe, ImgUrlPipe, FallbackImageDirective],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css'],
})
export class Checkout implements OnInit {
  ts = inject(TranslationService);
  cartService = inject(CartService);
  orderService = inject(OrderService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  settingsService = inject(SettingsService);
  couponService = inject(CouponService);
  router = inject(Router);
  socketService = inject(SocketService);
  private subs: Subscription[] = [];

  governorates = EGYPTIAN_GOVERNORATES;
  governorate = '';
  address = '';
  phone = '';
  notes = '';
  isProcessing = false;
  orderSuccess = false;
  ordersPaused = false;

  appSettings: AppSettings = this.settingsService.currentSettings;
  couponInput = '';
  appliedCoupon: ValidateCouponResponse | null = null;
  validatingCoupon = false;

  ngOnInit() {
    // Check if orders are paused & load shipping rules
    this.settingsService.getSettings().subscribe(settings => {
      this.appSettings = settings;
      this.ordersPaused = settings.ordersPaused;
    });

    // Listen to real-time settings changes
    this.subs.push(
      this.socketService.listen('settings_updated').subscribe((settings: any) => {
        if (settings) {
          this.appSettings = settings;
          this.ordersPaused = settings.ordersPaused;
        }
      })
    );

    if (this.cartService.getItems().length === 0) {
      this.router.navigate(['/cart']);
    }
    // Pre-fill phone from user data if logged in
    const userData = this.authService.getUserData();
    if (userData?.phone) {
      this.phone = userData.phone;
    }
    if (userData?.governorate) {
      this.governorate = userData.governorate;
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  get freeShippingThreshold(): number {
    return Number(this.appSettings?.freeShippingThreshold) || 0;
  }

  get remainingForFreeShipping(): number {
    const threshold = this.freeShippingThreshold;
    if (threshold <= 0) return 0;
    return Math.max(0, Math.round((threshold - this.cartService.cartTotal) * 100) / 100);
  }

  get shippingFee(): number {
    return this.settingsService.calculateShipping(this.governorate, this.cartService.cartTotal, this.appSettings);
  }

  get couponDiscount(): number {
    if (!this.appliedCoupon) return 0;
    return Math.min(this.cartService.cartTotal, this.appliedCoupon.discountAmount || 0);
  }

  get finalTotal(): number {
    return Math.max(0, Math.round((this.cartService.cartTotal - this.couponDiscount + this.shippingFee) * 100) / 100);
  }

  getItemFinalPrice(item: any): number {
    const base = item.selectedSize ? item.selectedSize.price : item.product.price;
    const unit = item.product.discountPercentage
      ? base * (1 - item.product.discountPercentage / 100)
      : base;
    return Math.round(unit * item.quantity * 100) / 100;
  }

  applyCoupon() {
    const code = this.couponInput.trim();
    if (!code || this.validatingCoupon) return;
    this.validatingCoupon = true;
    this.couponService.validateCoupon(code, this.cartService.cartTotal).subscribe({
      next: (res) => {
        this.validatingCoupon = false;
        this.appliedCoupon = res;
        this.toastService.show(
          this.ts.currentLang() === 'ar'
            ? `تم تطبيق الكوبون (${res.code}) بنجاح`
            : `Promo code (${res.code}) applied`,
          'success'
        );
      },
      error: (err) => {
        this.validatingCoupon = false;
        this.appliedCoupon = null;
        const msg = err.error?.message;
        const text = typeof msg === 'object'
          ? (this.ts.currentLang() === 'ar' ? (msg.ar || msg.en) : (msg.en || msg.ar))
          : (msg || (this.ts.currentLang() === 'ar' ? 'كود الخصم غير صالح' : 'Invalid promo code'));
        this.toastService.show(text, 'error');
      }
    });
  }

  removeCoupon() {
    this.appliedCoupon = null;
    this.couponInput = '';
  }

  formatPrice(price: number): string {
    return price.toLocaleString();
  }

  placeOrder() {
    if (!this.governorate || !this.address || !this.phone) {
      this.toastService.show(
        this.ts.currentLang() === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields',
        'error'
      );
      return;
    }

    if (this.address.length < 10) {
      this.toastService.show(
        this.ts.currentLang() === 'ar' ? 'العنوان يجب أن يكون 10 أحرف على الأقل' : 'Address must be at least 10 characters',
        'error'
      );
      return;
    }

    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(this.phone)) {
      this.toastService.show(
        this.ts.currentLang() === 'ar' ? 'رقم الهاتف غير صحيح' : 'Invalid phone number',
        'error'
      );
      return;
    }

    this.isProcessing = true;
    this.orderService.placeOrder({
      items: this.cartService.getItems(),
      governorate: this.governorate,
      address: this.address,
      phone: this.phone,
      notes: this.notes,
      couponCode: this.appliedCoupon?.code || null,
    }).subscribe({
      next: () => {
        this.isProcessing = false;
        this.orderSuccess = true;
        this.cartService.clearCart();
        this.toastService.show(this.ts.t('checkout.success'), 'success');
      },
      error: (err) => {
        this.isProcessing = false;
        
        if (err.error?.errors && err.error?.errors.length > 0) {
           const errMsg = err.error.errors[0].message;
           const msg = typeof errMsg === 'object' ? (this.ts.currentLang() === 'ar' ? (errMsg.ar || errMsg.en) : (errMsg.en || errMsg.ar)) : errMsg;
           this.toastService.show(msg, 'error');
           return;
        }

        this.toastService.show(
          this.ts.currentLang() === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'An error occurred, please try again',
          'error'
        );
      }
    });
  }
}
