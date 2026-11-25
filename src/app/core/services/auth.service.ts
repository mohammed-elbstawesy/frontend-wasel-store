import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { Auth, User } from '../models/users.model';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';
import { CartService } from './cart.service';
import { WishlistService } from './wishlist.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private url = environment.apiUrl + 'users/login';
  private _router = inject(Router);
  private _cartService = inject(CartService);
  private _wishlistService = inject(WishlistService);

  private authStateSubject = new BehaviorSubject<boolean>(this.isLogin());
  authState$ = this.authStateSubject.asObservable();

  constructor(private _http: HttpClient) {}

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  }

  login(data: { email: string; password: string }): Observable<Auth> {
    return this._http.post<Auth>(this.url, data).pipe(
      tap((res) => {
        if (res?.token) {
          localStorage.setItem('token', res.token);
          this.authStateSubject.next(true);
        }
      })
    );
  }

  getRole(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const decoded = jwtDecode<any>(token);
      return decoded.role || null;
    } catch {
      return null;
    }
  }

  getUserData(): any {
    const token = this.getToken();
    if (!token) return null;
    try {
      return jwtDecode<any>(token);
    } catch {
      return null;
    }
  }

  isLogin(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }

  logout(redirectUrl: string | null = '/'): void {
    localStorage.removeItem('token');
    this.authStateSubject.next(false);
    this._cartService.resetCart();
    this._wishlistService.resetWishlist();
    if (redirectUrl !== null) {
      this._router.navigate([redirectUrl]);
    }
  }

  signup(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    governorate: string;
    phone: string;
  }): Observable<any> {
    return this._http.post(`${environment.apiUrl}users/signup`, data).pipe(
      tap((res: any) => {
        if (res?.token) {
          localStorage.setItem('token', res.token);
          this.authStateSubject.next(true);
        }
      })
    );
  }

  editUser(data: any, _id: string): Observable<any> {
    return this._http.put(`${environment.apiUrl}users/edit/${_id}`, data);
  }

  forgotPassword(email: string): Observable<any> {
    return this._http.post(`${environment.apiUrl}users/forgot-password`, { email });
  }

  verifyOTP(email: string, otp: string): Observable<{ resetToken: string }> {
    return this._http.post<{ resetToken: string }>(`${environment.apiUrl}users/verify-otp`, { email, otp });
  }

  verifyAccount(email: string, otp: string): Observable<{ token: string }> {
    return this._http.post<{ token: string }>(`${environment.apiUrl}users/verify`, { email, otp }).pipe(
      tap((res) => {
        if (res?.token) {
          localStorage.setItem('token', res.token);
          this.authStateSubject.next(true);
        }
      })
    );
  }

  resendOTP(email: string): Observable<any> {
    return this._http.post(`${environment.apiUrl}users/resend-otp`, { email });
  }

  resetPassword(data: { resetToken: string; newPassword: string }): Observable<any> {
    return this._http.post(`${environment.apiUrl}users/reset-password`, data);
  }
}