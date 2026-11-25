import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { SocketService } from '../../../core/services/socket.service';

@Component({
  selector: 'app-admin-stock',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
      <h1 class="page-title" style="margin-bottom: 0;">{{ 'dash.stock' | translate }}</h1>
      <input type="text" class="form-input" style="max-width: 300px; flex: 1;"
             [placeholder]="ts.currentLang() === 'ar' ? 'بحث باسم المنتج...' : 'Search product name...'"
             [(ngModel)]="searchQuery" (ngModelChange)="applySearch()">
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>{{ ts.currentLang() === 'ar' ? 'المنتج' : 'Product' }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'المتاح' : 'Available' }}</th>
            <th>{{ 'dash.status' | translate }}</th>
            <th>{{ 'dash.actions' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          @for (product of products; track product._id) {
            <tr>
              <td>
                <div style="font-weight: 700;">{{ ts.localize(product.name) }}</div>
                @if (product.sizes && product.sizes.length > 0) {
                  <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">{{ ts.currentLang() === 'ar' ? 'متعدد الأحجام' : 'Multiple Sizes' }}</div>
                }
              </td>
              <td class="stock-val">
                @if (product.sizes && product.sizes.length > 0) {
                  @for (size of product.sizes; track size.label) {
                    <div style="font-size: 13px; margin-bottom: 2px;">
                      <span style="color: var(--text-muted); margin-right: 4px;">{{ size.label }}:</span>
                      {{ size.stock || 0 }}
                    </div>
                  }
                } @else {
                  {{ product.stock }}
                }
              </td>
              <td>
                @if (product.stock === 0) {
                  <span class="badge badge-danger">{{ 'product.out_of_stock' | translate }}</span>
                } @else if (product.stock < 10) {
                  <span class="badge badge-warning">{{ 'dash.low_stock' | translate }}</span>
                } @else {
                  <span class="badge badge-success">{{ 'product.in_stock' | translate }}</span>
                }
              </td>
              <td>
                @if (product.sizes && product.sizes.length > 0) {
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    @for (size of product.sizes; track size.label) {
                      <button class="btn btn-outline btn-sm" style="font-size: 11px; padding: 2px 8px;" (click)="openAdjust(product, size.label)">
                        {{ ts.currentLang() === 'ar' ? 'تعديل' : 'Adjust' }} ({{ size.label }})
                      </button>
                    }
                  </div>
                } @else {
                  <button class="btn btn-outline btn-sm" (click)="openAdjust(product)">
                    {{ 'dash.adjust_stock' | translate }}
                  </button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Adjust Modal -->
    @if (adjustProduct) {
      <div class="modal-overlay" (click)="adjustProduct = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ 'dash.adjust_stock' | translate }} — {{ ts.localize(adjustProduct.name) }}</h2>
            <button class="modal-close" (click)="adjustProduct = null">✕</button>
          </div>
          <div class="modal-body">
            <p class="current-stock">{{ ts.currentLang() === 'ar' ? 'المخزون الحالي' : 'Current Stock' }}: 
              <strong>
                @if (adjustSizeLabel) {
                  @for (size of adjustProduct.sizes; track size.label) {
                    @if (size.label === adjustSizeLabel) {
                      {{ size.stock || 0 }}
                    }
                  }
                } @else {
                  {{ adjustProduct.stock }}
                }
              </strong>
            </p>
            <div class="form-group">
              <label class="form-label">{{ ts.currentLang() === 'ar' ? 'الكمية (+ لإضافة، - لخصم)' : 'Quantity (+ to add, - to subtract)' }}</label>
              <input type="number" class="form-input" [(ngModel)]="adjustQty">
            </div>
            <div class="form-group">
              <label class="form-label">{{ 'dash.reason' | translate }}</label>
              <select class="form-select" [(ngModel)]="adjustReason">
                <option value="">{{ ts.currentLang() === 'ar' ? 'اختر السبب' : 'Select reason' }}</option>
                <option value="manual_sale">{{ 'dash.manual_sale' | translate }}</option>
                <option value="restock">{{ ts.currentLang() === 'ar' ? 'إعادة تعبئة' : 'Restock' }}</option>
                <option value="damaged">{{ ts.currentLang() === 'ar' ? 'تالف' : 'Damaged' }}</option>
                <option value="correction">{{ ts.currentLang() === 'ar' ? 'تصحيح' : 'Correction' }}</option>
              </select>
            </div>
            <button class="btn btn-primary" (click)="submitAdjust()" [disabled]="!adjustReason || adjustQty === 0">
              {{ 'dash.save' | translate }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-title { font-size: 26px; font-weight: 700; margin-bottom: 24px; }
    .stock-val { font-weight: 700; font-size: 16px; }
    .current-stock { margin-bottom: 16px; font-size: 15px; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-content { background: var(--bg-card); border-radius: var(--radius); max-width: 420px; width: 100%; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
    .modal-header h2 { font-size: 16px; font-weight: 600; }
    .modal-close { font-size: 18px; color: var(--text-muted); }
    .modal-body { padding: 20px; }
  `]
})
export class StockManagement implements OnInit, OnDestroy {
  ts = inject(TranslationService);
  productService = inject(ProductService);
  toastService = inject(ToastService);
  socketService = inject(SocketService);

  products: Product[] = [];
  allProducts: Product[] = [];
  searchQuery = '';
  adjustProduct: Product | null = null;
  adjustSizeLabel: string | null = null;
  adjustQty = 0;
  adjustReason = '';
  private subs: Subscription[] = [];

  ngOnInit() {
    this.loadProducts();

    // Listen for real-time stock updates
    this.subs.push(
      this.socketService.listen('stock_updated').subscribe(() => {
        this.loadProducts();
      })
    );

    // Fallback polling when deployed on serverless (Vercel)
    this.subs.push(
      this.socketService.pollInServerless(30000).subscribe(() => {
        this.loadProducts();
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadProducts() {
    this.productService.getAdminProducts().subscribe(p => {
      this.allProducts = p;
      this.applySearch();
    });
  }

  applySearch() {
    if (!this.searchQuery.trim()) {
      this.products = this.allProducts;
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.products = this.allProducts.filter(p => {
      const nameMatch = (p.name.en && p.name.en.toLowerCase().includes(q)) || 
                        (p.name.ar && p.name.ar.includes(this.searchQuery));
      return nameMatch;
    });
  }

  openAdjust(product: Product, sizeLabel?: string) {
    this.adjustProduct = product;
    this.adjustSizeLabel = sizeLabel || null;
    this.adjustQty = 0;
    this.adjustReason = '';
  }

  submitAdjust() {
    if (!this.adjustProduct || !this.adjustReason || this.adjustQty === 0) return;
    
    let currentStock = this.adjustProduct.stock;
    if (this.adjustSizeLabel && this.adjustProduct.sizes) {
      const size = this.adjustProduct.sizes.find(s => s.label === this.adjustSizeLabel);
      if (size) {
        currentStock = size.stock || 0;
      }
    }

    const newStock = currentStock + this.adjustQty;
    if (newStock < 0) {
      this.toastService.show(
        this.ts.currentLang() === 'ar' ? 'لا يمكن أن يكون المخزون سالب' : 'Stock cannot be negative',
        'error'
      );
      return;
    }

    this.productService.updateStock(this.adjustProduct._id, newStock, this.adjustReason, this.adjustSizeLabel || undefined).subscribe({
      next: () => {
        this.toastService.show(
          this.ts.currentLang() === 'ar' ? 'تم تعديل المخزون بنجاح' : 'Stock adjusted successfully',
          'success'
        );
        this.adjustProduct = null;
        this.adjustSizeLabel = null;
        this.loadProducts();
      },
      error: () => {
        this.toastService.show(
          this.ts.currentLang() === 'ar' ? 'حدث خطأ أثناء تعديل المخزون' : 'Error adjusting stock',
          'error'
        );
      }
    });
  }
}
