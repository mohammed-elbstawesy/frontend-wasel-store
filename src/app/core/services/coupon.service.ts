import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Coupon {
  _id?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  expiryDate: string;
  usageLimit: number;
  usedCount?: number;
  isActive: boolean;
}

export interface ValidateCouponResponse {
  valid: boolean;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount: number;
  minOrderAmount: number;
  discountAmount: number;
}

@Injectable({ providedIn: 'root' })
export class CouponService {
  private apiUrl = environment.apiUrl + 'coupons';

  constructor(private http: HttpClient) {}

  validateCoupon(code: string, subtotal: number): Observable<ValidateCouponResponse> {
    return this.http.post<ValidateCouponResponse>(`${this.apiUrl}/validate`, { code, subtotal });
  }

  getCoupons(): Observable<Coupon[]> {
    return this.http.get<Coupon[]>(this.apiUrl);
  }

  createCoupon(data: Partial<Coupon>): Observable<{ message: string; data: Coupon }> {
    return this.http.post<{ message: string; data: Coupon }>(this.apiUrl, data);
  }

  updateCoupon(id: string, data: Partial<Coupon>): Observable<{ message: string; data: Coupon }> {
    return this.http.put<{ message: string; data: Coupon }>(`${this.apiUrl}/${id}`, data);
  }

  deleteCoupon(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
