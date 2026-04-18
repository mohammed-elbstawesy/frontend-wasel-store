import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
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
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
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
        await this.cartService.mergeAndLoadCartOnLogin();
        await this.wishlistService.mergeAndLoadWishlistOnLogin();
        const role = this.authService.getRole();
        if (role === 'admin') {
          this.router.navigate(['/dashboard']);
        } else {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
          this.router.navigateByUrl(returnUrl);
        }
      },
      error: (err) => {
        this.isLoading = false;
        let msg = err.error?.message || (this.ts.currentLang() === 'ar' ? 'البريد أو كلمة المرور غير صحيحة' : 'Invalid email or password');
        
        if (err.error?.suspended && this.ts.currentLang() === 'ar') {
          const reasonPart = msg.split('Reason: ')[1] || 'غير محدد';
          msg = 'عذراً، تم تعطيل حسابك. السبب: ' + reasonPart;
        }
        
        this.toastService.show(msg, 'error');
      },
    });
  }
}