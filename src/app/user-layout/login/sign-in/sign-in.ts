import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  toastService = inject(ToastService);
  ts = inject(TranslationService);

  showPassword = false;
  isLoading = false;

  // Unverified account OTP verification state
  otpMode = false;
  unverifiedEmail = '';
  otpCode = '';
  verifying = false;
  resending = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.authService.login(this.form.value as any).subscribe({
      next: async () => {
        this.isLoading = false;
        await this.finishLoginNavigation();
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 403 && err.error?.notVerified) {
          this.unverifiedEmail = (this.form.value.email || '').trim();
          this.otpMode = true;
          this.otpCode = '';
          this.toastService.show(
            this.ts.currentLang() === 'ar'
              ? 'حسابك غير مفعّل بعد. أدخل كود التفعيل المرسل لبريدك أو اطلب كوداً جديداً.'
              : 'Your account is not verified yet. Enter the OTP code or request a new one.',
            'info'
          );
          return;
        }

        let msg = err.error?.message || (this.ts.currentLang() === 'ar' ? 'البريد أو كلمة المرور غير صحيحة' : 'Invalid email or password');

        if (err.error?.suspended && this.ts.currentLang() === 'ar') {
          const reasonPart = msg.split('Reason: ')[1] || 'غير محدد';
          msg = 'عذراً، تم تعطيل حسابك. السبب: ' + reasonPart;
        }

        this.toastService.show(msg, 'error');
      },
    });
  }

  verifyUnverifiedAccount() {
    if (!this.otpCode || this.otpCode.trim().length < 5) return;
    this.verifying = true;
    this.authService.verifyAccount(this.unverifiedEmail, this.otpCode.trim()).subscribe({
      next: async () => {
        this.verifying = false;
        this.toastService.show(
          this.ts.currentLang() === 'ar' ? 'تم تفعيل الحساب وتسجيل الدخول بنجاح!' : 'Account verified & signed in!',
          'success'
        );
        await this.finishLoginNavigation();
      },
      error: (err) => {
        this.verifying = false;
        const msg = err.error?.message || (this.ts.currentLang() === 'ar' ? 'كود التحقق غير صحيح أو منتهي' : 'Invalid or expired OTP code');
        this.toastService.show(msg, 'error');
      }
    });
  }

  resendVerificationCode() {
    if (!this.unverifiedEmail || this.resending) return;
    this.resending = true;
    this.authService.resendOTP(this.unverifiedEmail).subscribe({
      next: () => {
        this.resending = false;
        this.toastService.show(
          this.ts.currentLang() === 'ar' ? 'تم إرسال كود تفعيل جديد إلى بريدك الإلكتروني' : 'A new verification code has been sent to your email',
          'success'
        );
      },
      error: () => {
        this.resending = false;
        this.toastService.show(
          this.ts.currentLang() === 'ar' ? 'فشل إرسال الكود' : 'Failed to send verification code',
          'error'
        );
      }
    });
  }

  private async finishLoginNavigation() {
    await this.cartService.mergeAndLoadCartOnLogin();
    await this.wishlistService.mergeAndLoadWishlistOnLogin();
    const role = this.authService.getRole();
    if (role === 'admin') {
      this.router.navigate(['/dashboard']);
    } else {
      const returnUrl =
        this.route.snapshot.queryParams['returnUrl'] ||
        this.route.parent?.snapshot.queryParams['returnUrl'] ||
        '/';
      this.router.navigateByUrl(returnUrl);
    }
  }
}