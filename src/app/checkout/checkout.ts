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
import { SettingsService } from '../core/services/settings.service';
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

  ngOnInit() {
    // Check if orders are paused initially
    this.settingsService.getSettings().subscribe(settings => {
      this.ordersPaused = settings.ordersPaused;
    });

    // Listen to real-time settings changes
    this.subs.push(
      this.socketService.listen('settings_updated').subscribe((settings: any) => {
        if (settings) {
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
