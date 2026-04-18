import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppSettings {
  _id?: string;
  ordersPaused: boolean;
  ordersPausedMessage: { en: string; ar: string };
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private apiUrl = environment.apiUrl + 'settings';

  private settingsSubject = new BehaviorSubject<AppSettings>({
    ordersPaused: false,
    ordersPausedMessage: { en: 'Orders are temporarily paused.', ar: 'الطلبات متوقفة مؤقتاً.' }
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
}
