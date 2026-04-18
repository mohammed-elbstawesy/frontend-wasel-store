import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'dash.logs' | translate }}</h1>
      <button class="btn btn-outline btn-sm" (click)="loadLogs()">{{ ts.currentLang() === 'ar' ? 'تحديث' : 'Refresh' }}</button>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>{{ ts.currentLang() === 'ar' ? 'الوقت' : 'Timestamp' }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'المستوى' : 'Level' }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'الرسالة / الحدث' : 'Message / Event' }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'تفاصيل' : 'Metadata' }}</th>
          </tr>
        </thead>
        <tbody>
          @for (log of logs; track log._id) {
            <tr>
              <td class="time-col" dir="ltr">{{ log.timestamp | date:'short' }}</td>
              <td>
                <span class="badge" [class.badge-danger]="log.level === 'error'" [class.badge-warning]="log.level === 'warn'" [class.badge-info]="log.level === 'info'">
                  {{ log.level | uppercase }}
                </span>
              </td>
              <td>{{ log.message }}</td>
              <td>
                @if (log.meta) {
                  <pre class="meta-code">{{ log.meta | json }}</pre>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (logs.length === 0) {
      <p class="empty-text">{{ ts.currentLang() === 'ar' ? 'لا توجد سجلات بالنظام' : 'No system logs available' }}</p>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .page-title { font-size: 26px; font-weight: 700; }
    .time-col { font-family: monospace; white-space: nowrap; color: var(--text-muted); }
    .meta-code { background: var(--surface); padding: 4px; border-radius: 4px; font-size: 11px; max-height: 60px; overflow-y: auto; color: var(--text-muted);}
    .empty-text { text-align: center; padding: 40px; color: var(--text-muted); }
  `]
})
export class Logs implements OnInit {
  ts = inject(TranslationService);
  private http = inject(HttpClient);
  logs: any[] = [];

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.http.get<any[]>(`${environment.apiUrl}logs`).subscribe({
      next: (data) => this.logs = data,
      error: (err) => console.error('Failed to load logs', err)
    });
  }
}
