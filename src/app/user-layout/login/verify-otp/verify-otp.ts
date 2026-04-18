import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  template: `
    <div class="auth-page">
      <div class="auth-card animate-fadeIn">
        <div class="auth-header">
          <h1>{{ 'auth.verify_otp' | translate }}</h1>
        </div>
        <form [formGroup]="otpForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label">{{ ts.currentLang() === 'ar' ? 'رمز التحقق' : 'Verification Code' }}</label>
            <input type="text" class="form-input" formControlName="otp" maxlength="6" dir="ltr" placeholder="000000">
          </div>
          <button type="submit" class="btn btn-primary btn-lg" style="width:100%" [disabled]="isLoading">
            @if (isLoading) { <span class="spinner"></span> }
            {{ 'auth.verify_otp' | translate }}
          </button>
        </form>
        <button class="btn btn-ghost" style="width:100%;margin-top:8px" (click)="resendCode()" [disabled]="isLoading">
          {{ ts.currentLang() === 'ar' ? 'إعادة إرسال الرمز' : 'Resend Code' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: calc(100vh - 64px); display: flex; align-items: center; justify-content: center; padding: 32px 16px; background: var(--bg); }
    .auth-card { width: 100%; max-width: 400px; background: white; border-radius: var(--radius); border: 1px solid var(--border); padding: 32px; }
    .auth-header { text-align: center; margin-bottom: 24px; }
    .auth-header h1 { font-size: 22px; font-weight: 700; }
  `]
})
export class VerifyOtp implements OnInit {
  fb = inject(FormBuilder);
  router = inject(Router);
  route = inject(ActivatedRoute);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  ts = inject(TranslationService);

  otpForm: FormGroup;
  isLoading = false;
  email = '';

  constructor() {
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]*$')]]
    });
  }

  ngOnInit() {
    this.email = this.route.snapshot.queryParams['email'];
    if (!this.email) {
      this.router.navigate(['/login/forgot-password']);
    }
  }

  onSubmit() {
    if (this.otpForm.invalid) return;
    this.isLoading = true;
    this.authService.verifyOTP(this.email, this.otpForm.value.otp).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.router.navigate(['/login/reset-password'], { queryParams: { token: res.resetToken } });
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastService.show(err.error?.message || 'Verification failed', 'error');
      }
    });
  }

  resendCode() {
    this.isLoading = true;
    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم إرسال رمز جديد' : 'New code sent', 'success');
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastService.show(err.error?.message || 'Failed to resend', 'error');
      }
    });
  }
}