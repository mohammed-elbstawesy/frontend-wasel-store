import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ShippingRate {
  governorate: string;
  fee: number;
}

export interface AppSettings {
  _id?: string;
  ordersPaused: boolean;
  ordersPausedMessage: { en: string; ar: string };
  freeShippingThreshold?: number;
  defaultShippingFee?: number;
  shippingRates?: ShippingRate[];
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private apiUrl = environment.apiUrl + 'settings';

  private settingsSubject = new BehaviorSubject<AppSettings>({
    ordersPaused: false,
    ordersPausedMessage: { en: 'Orders are temporarily paused.', ar: 'الطلبات متوقفة مؤقتاً.' },
    freeShippingThreshold: 500,
    defaultShippingFee: 50,
    shippingRates: []
  });
  settings$ = this.settingsSubject.asObservable();

  constructor(private http: HttpClient) {}

  getSettings(): Observable<AppSettings> {
    return this.http.get<AppSettings>(this.apiUrl).pipe(
      tap(settings => this.settingsSubject.next(settings))
    );
  }

  updateSettings(data: Partial<AppSettings>): Observable<any> {
    return this.http.patch(this.apiUrl, data).pipe(
      tap((res: any) => {
        if (res?.data) {
          this.settingsSubject.next(res.data);
        }
      })
    );
  }

  get currentSettings(): AppSettings {
    return this.settingsSubject.value;
  }

  calculateShipping(governorate: string, subtotal: number, settings: AppSettings = this.currentSettings): number {
    if (!governorate) return 0;
    const threshold = Number(settings?.freeShippingThreshold) || 0;
    if (threshold > 0 && subtotal >= threshold) {
      return 0;
    }
    const normalized = governorate.trim().toLowerCase();
    const match = settings?.shippingRates?.find(
      r => r.governorate && r.governorate.trim().toLowerCase() === normalized
    );
    if (match) return Number(match.fee) || 0;
    return Number(settings?.defaultShippingFee ?? 50);
  }
}
