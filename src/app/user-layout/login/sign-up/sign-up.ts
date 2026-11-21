import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { EGYPTIAN_GOVERNORATES } from '../../../core/models/users.model';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class SignUp {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cartService = inject(CartService);
  private wishlistService = inject(WishlistService);
  toastService = inject(ToastService);
  ts = inject(TranslationService);

  governorates = EGYPTIAN_GOVERNORATES;
  showPassword = false;
  showRePassword = false;
  isLoading = false;
  
  otpMode = false;
  otpCode = '';
  signupEmail = '';
  verifying = false;

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rePassword: ['', [Validators.required]],
    governorate: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{10,11}$')]],
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const rePassword = control.get('rePassword');
    if (!password || !rePassword) return null;
    if (password.value !== rePassword.value) {
      rePassword.setErrors({ ...rePassword.errors, mismatch: true });
    } else if (rePassword.errors) {
      delete rePassword.errors['mismatch'];
      if (Object.keys(rePassword.errors).length === 0) rePassword.setErrors(null);
    }
    return null;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    const { rePassword, ...data } = this.form.value;
    this.authService.signup(data as any).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.signupEmail = res.email || this.form.value.email;
        this.otpMode = true;
        this.toastService.show(
          this.ts.currentLang() === 'ar' ? 'تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني.' : 'Account created! Please check your email.',
          'success'
        );
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.message ||
          (this.ts.currentLang() === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'An error occurred');
        this.toastService.show(msg, 'error');
      },
    });
  }

  verifyAccount() {
    if (!this.otpCode || this.otpCode.length < 6) return;
    this.verifying = true;
    this.authService.verifyAccount(this.signupEmail, this.otpCode).subscribe({
      next: async () => {
        this.verifying = false;
        this.toastService.show(
          this.ts.currentLang() === 'ar' ? 'تم تأكيد الحساب بنجاح!' : 'Account verified successfully!',
          'success'
        );
        await this.cartService.mergeAndLoadCartOnLogin();
        await this.wishlistService.mergeAndLoadWishlistOnLogin();
        const returnUrl =
          this.route.snapshot.queryParams['returnUrl'] ||
          this.route.parent?.snapshot.queryParams['returnUrl'] ||
          '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.verifying = false;
        const msg = err.error?.message || (this.ts.currentLang() === 'ar' ? 'كود غير صحيح' : 'Invalid code');
        this.toastService.show(msg, 'error');
      }
    });
  }

  resendCode() {
    this.authService.resendOTP(this.signupEmail).subscribe({
      next: () => {
        this.toastService.show(
          this.ts.currentLang() === 'ar' ? 'تم إرسال كود جديد' : 'New code sent',
          'info'
        );
      },
      error: () => {
        this.toastService.show(
          this.ts.currentLang() === 'ar' ? 'فشل إرسال الكود' : 'Failed to send new code',
          'error'
        );
      }
    });
  }
}