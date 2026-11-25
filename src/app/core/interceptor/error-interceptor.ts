import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { TranslationService } from '../services/translation.service';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const authService = inject(AuthService);
  const ts = inject(TranslationService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMsg = '';
      if (error.status === 0) {
        // Network error or server is completely down
        errorMsg = ts.currentLang() === 'ar'
          ? 'لا يوجد اتصال بالسيرفر. تحقق من الإنترنت وحاول مرة أخرى.'
          : 'No connection to the server. Please check your internet or try again later.';
        toastService.show(errorMsg, 'error');
      } else if (error.status === 401) {
        // Ignore 401 from login endpoints
        if (!req.url.includes('/login')) {
          const currentUrl = router.url;
          authService.logout(null);
          toastService.show(
            ts.currentLang() === 'ar'
              ? 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.'
              : 'Session expired. Please log in again.',
            'error'
          );
          if (currentUrl.startsWith('/login')) {
            router.navigate(['/login/signin']);
          } else {
            router.navigate(['/login/signin'], { queryParams: { returnUrl: currentUrl } });
          }
        }
      } else {
        // Server returned an error response (4xx, 5xx)
        errorMsg = error.error?.message || `Server Error: ${error.status}`;
        // We only show global toast for 500+ errors to not annoy users for 400 Bad Request validations
        if (error.status >= 500) {
          toastService.show(
            ts.currentLang() === 'ar' ? 'حدث خطأ في السيرفر، حاول مرة أخرى.' : 'A server error occurred. Please try again.',
            'error'
          );
        }
      }
      return throwError(() => error);
    })
  );
};
