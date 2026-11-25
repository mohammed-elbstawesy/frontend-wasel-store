import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';
import { CouponService, Coupon } from '../../../core/services/coupon.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
      <h1 class="page-title" style="margin:0;">🎟️ {{ ts.currentLang() === 'ar' ? 'أكواد الخصم (الكوبونات)' : 'Promo Codes & Coupons' }}</h1>
      <button class="btn btn-primary btn-sm" (click)="openModal()">
        + {{ ts.currentLang() === 'ar' ? 'إضافة كوبون جديد' : 'Add New Coupon' }}
      </button>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>{{ ts.currentLang() === 'ar' ? 'الكود' : 'Code' }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'الخصم' : 'Discount' }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'الحد الأدنى للطلب' : 'Min Order' }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'الاستخدام' : 'Usage' }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'تاريخ الانتهاء' : 'Expiry' }}</th>
            <th>{{ 'dash.status' | translate }}</th>
            <th>{{ 'dash.actions' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          @if (coupons.length === 0) {
            <tr>
              <td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">
                {{ ts.currentLang() === 'ar' ? 'لا توجد كوبونات خصم بعد' : 'No promo codes created yet' }}
              </td>
            </tr>
          }
          @for (c of coupons; track c._id) {
            <tr>
              <td><strong style="letter-spacing:1px; color:var(--primary);">{{ c.code }}</strong></td>
              <td>
                @if (c.discountType === 'percentage') {
                  {{ c.discountValue }}%
                  @if (c.maxDiscount > 0) {
                    <small style="color:var(--text-muted);">({{ ts.currentLang() === 'ar' ? 'حد أقصى' : 'max' }} {{ c.maxDiscount }})</small>
                  }
                } @else {
                  {{ c.discountValue }} {{ 'product.egp' | translate }}
                }
              </td>
              <td>{{ c.minOrderAmount > 0 ? (c.minOrderAmount + ' ' + ('product.egp' | translate)) : '-' }}</td>
              <td>{{ c.usedCount || 0 }} / {{ c.usageLimit > 0 ? c.usageLimit : '∞' }}</td>
              <td>{{ c.expiryDate | date:'mediumDate' }}</td>
              <td>
                @if (!c.isActive) {
                  <span class="badge badge-danger">{{ ts.currentLang() === 'ar' ? 'معطّل' : 'Inactive' }}</span>
                } @else if (isExpired(c.expiryDate)) {
                  <span class="badge badge-warning">{{ ts.currentLang() === 'ar' ? 'منتهي' : 'Expired' }}</span>
                } @else {
                  <span class="badge badge-success">{{ ts.currentLang() === 'ar' ? 'نشط' : 'Active' }}</span>
                }
              </td>
              <td>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-ghost btn-sm" (click)="openModal(c)">{{ 'dash.edit' | translate }}</button>
                  <button class="btn btn-ghost btn-sm" (click)="toggleActive(c)">
                    {{ c.isActive ? (ts.currentLang() === 'ar' ? 'إيقاف' : 'Disable') : (ts.currentLang() === 'ar' ? 'تفعيل' : 'Enable') }}
                  </button>
                  <button class="btn btn-ghost btn-sm text-danger" (click)="deleteCoupon(c)">{{ 'dash.delete' | translate }}</button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (isModalOpen) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editId ? (ts.currentLang() === 'ar' ? 'تعديل كوبون' : 'Edit Coupon') : (ts.currentLang() === 'ar' ? 'إضافة كوبون' : 'Create Coupon') }}</h2>
            <button class="modal-close" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">{{ ts.currentLang() === 'ar' ? 'كود الخصم' : 'Coupon Code' }} *</label>
              <input type="text" class="form-input" [(ngModel)]="form.code" style="text-transform:uppercase;" placeholder="WASEL20">
            </div>

            <div style="display:flex; gap:12px;">
              <div class="form-group" style="flex:1;">
                <label class="form-label">{{ ts.currentLang() === 'ar' ? 'نوع الخصم' : 'Discount Type' }}</label>
                <select class="form-select" [(ngModel)]="form.discountType">
                  <option value="percentage">{{ ts.currentLang() === 'ar' ? 'نسبة مئوية (%)' : 'Percentage (%)' }}</option>
                  <option value="fixed">{{ ts.currentLang() === 'ar' ? 'مبلغ ثابت (ج.م)' : 'Fixed Amount (EGP)' }}</option>
                </select>
              </div>
              <div class="form-group" style="flex:1;">
                <label class="form-label">{{ ts.currentLang() === 'ar' ? 'قيمة الخصم' : 'Discount Value' }} *</label>
                <input type="number" min="1" class="form-input" [(ngModel)]="form.discountValue">
              </div>
            </div>

            <div style="display:flex; gap:12px;">
              <div class="form-group" style="flex:1;">
                <label class="form-label">{{ ts.currentLang() === 'ar' ? 'الحد الأدنى للطلب (ج.م)' : 'Min Order Amount (EGP)' }}</label>
                <input type="number" min="0" class="form-input" [(ngModel)]="form.minOrderAmount">
              </div>
              <div class="form-group" style="flex:1;">
                <label class="form-label">{{ ts.currentLang() === 'ar' ? 'أقصى خصم (0 = بلا حد)' : 'Max Discount (0 = none)' }}</label>
                <input type="number" min="0" class="form-input" [(ngModel)]="form.maxDiscount" [disabled]="form.discountType === 'fixed'">
              </div>
            </div>

            <div style="display:flex; gap:12px;">
              <div class="form-group" style="flex:1;">
                <label class="form-label">{{ ts.currentLang() === 'ar' ? 'عدد مرات الاستخدام (0 = مفتوح)' : 'Usage Limit (0 = unlimited)' }}</label>
                <input type="number" min="0" class="form-input" [(ngModel)]="form.usageLimit">
              </div>
              <div class="form-group" style="flex:1;">
                <label class="form-label">{{ ts.currentLang() === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date' }} *</label>
                <input type="date" class="form-input" [(ngModel)]="form.expiryDate">
              </div>
            </div>

            <div class="form-group">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" [(ngModel)]="form.isActive">
                {{ ts.currentLang() === 'ar' ? 'الكوبون نشط' : 'Coupon is Active' }}
              </label>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
              <button class="btn btn-ghost" (click)="closeModal()" [disabled]="saving">{{ 'dash.cancel' | translate }}</button>
              <button class="btn btn-primary" (click)="saveCoupon()" [disabled]="saving">{{ saving ? '...' : ('dash.save' | translate) }}</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-title { font-size: 26px; font-weight: 700; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-content { background: var(--bg-card); border-radius: var(--radius); max-width: 540px; width: 100%; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
    .modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
    .modal-close { font-size: 18px; color: var(--text-muted); background: transparent; border: none; cursor: pointer; }
    .modal-body { padding: 20px; }
    .form-select { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); }
  `]
})
export class AdminCoupons implements OnInit {
  ts = inject(TranslationService);
  couponService = inject(CouponService);
  toastService = inject(ToastService);
  confirmService = inject(ConfirmService);

  coupons: Coupon[] = [];
  isModalOpen = false;
  editId: string | null = null;
  saving = false;

  form: any = this.emptyForm();

  ngOnInit() {
    this.loadCoupons();
  }

  emptyForm() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return {
      code: '',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 0,
      maxDiscount: 0,
      usageLimit: 0,
      expiryDate: nextMonth.toISOString().split('T')[0],
      isActive: true
    };
  }

  loadCoupons() {
    this.couponService.getCoupons().subscribe(list => this.coupons = list);
  }

  isExpired(dateStr: string): boolean {
    return new Date(dateStr) < new Date();
  }

  openModal(c?: Coupon) {
    this.isModalOpen = true;
    if (c && c._id) {
      this.editId = c._id;
      this.form = {
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrderAmount: c.minOrderAmount || 0,
        maxDiscount: c.maxDiscount || 0,
        usageLimit: c.usageLimit || 0,
        expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString().split('T')[0] : '',
        isActive: c.isActive
      };
    } else {
      this.editId = null;
      this.form = this.emptyForm();
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveCoupon() {
    if (!this.form.code?.trim() || !this.form.discountValue || !this.form.expiryDate) {
      this.toastService.show(
        this.ts.currentLang() === 'ar' ? 'يرجى إكمال الحقول المطلوبة' : 'Please fill all required fields',
        'error'
      );
      return;
    }
    this.saving = true;
    const payload = { ...this.form, code: this.form.code.trim().toUpperCase() };
    const req$ = this.editId
      ? this.couponService.updateCoupon(this.editId, payload)
      : this.couponService.createCoupon(payload);

    req$.subscribe({
      next: () => {
        this.saving = false;
        this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully', 'success');
        this.closeModal();
        this.loadCoupons();
      },
      error: (err) => {
        this.saving = false;
        this.toastService.show(err.error?.message || 'Error saving coupon', 'error');
      }
    });
  }

  toggleActive(c: Coupon) {
    if (!c._id) return;
    this.couponService.updateCoupon(c._id, { isActive: !c.isActive }).subscribe(() => {
      this.loadCoupons();
    });
  }

  async deleteCoupon(c: Coupon) {
    if (!c._id) return;
    const ok = await this.confirmService.ask(
      this.ts.currentLang() === 'ar' ? `حذف الكوبون "${c.code}"؟` : `Delete coupon "${c.code}"?`,
      'danger'
    );
    if (ok) {
      this.couponService.deleteCoupon(c._id).subscribe(() => {
        this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم الحذف' : 'Coupon deleted', 'success');
        this.loadCoupons();
      });
    }
  }
}
