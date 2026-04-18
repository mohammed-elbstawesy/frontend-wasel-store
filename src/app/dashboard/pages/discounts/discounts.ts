import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { Product } from '../../../core/models/product.model';
import { Category } from '../../../core/models/category.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-discounts',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ ts.currentLang() === 'ar' ? 'إدارة الخصومات' : 'Discounts Management' }}</h1>
    </div>

    <div class="card p-4">
       <h3 class="mb-3">{{ ts.currentLang() === 'ar' ? 'تطبيق خصم جديد' : 'Apply New Discount' }}</h3>
       
       <div class="form-group row-group">
          <div class="w-33">
             <label class="form-label">{{ ts.currentLang() === 'ar' ? 'نسبة الخصم (%)' : 'Discount Percentage (%)' }}</label>
             <input type="number" min="0" max="100" class="form-input" [(ngModel)]="discountData.percentage" placeholder="e.g. 20">
          </div>
          <div class="w-33">
             <label class="form-label">{{ ts.currentLang() === 'ar' ? 'تاريخ ووقت الانتهاء' : 'Expiry Date & Time' }}</label>
             <input type="datetime-local" class="form-input" [(ngModel)]="discountData.expiry">
          </div>
       </div>

       <div class="form-group mt-3">
          <label class="form-label">{{ ts.currentLang() === 'ar' ? 'تطبيق الخصم على' : 'Apply Discount To' }}</label>
          <div class="radio-group">
             <label><input type="radio" name="applyTo" value="all" [(ngModel)]="discountData.applyTo"> {{ ts.currentLang() === 'ar' ? 'كل المنتجات' : 'All Products' }}</label>
             <label><input type="radio" name="applyTo" value="category" [(ngModel)]="discountData.applyTo"> {{ ts.currentLang() === 'ar' ? 'قسم معين' : 'Specific Category' }}</label>
             <label><input type="radio" name="applyTo" value="product" [(ngModel)]="discountData.applyTo"> {{ ts.currentLang() === 'ar' ? 'منتج محدد' : 'Specific Product' }}</label>
          </div>
       </div>

       @if (discountData.applyTo === 'category') {
       <div class="form-group row-group">
          <div class="w-50">
             <label class="form-label">{{ ts.currentLang() === 'ar' ? 'اختر القسم' : 'Select Category' }}</label>
             <select class="form-select" [(ngModel)]="discountData.categoryId" (change)="onCategorySelect()">
               <option value="">--</option>
               @for (cat of categories; track cat._id) {
                 <option [value]="cat._id">{{ ts.localize(cat.name) }}</option>
               }
             </select>
          </div>
          <div class="w-50">
             <label class="form-label">{{ ts.currentLang() === 'ar' ? 'القسم الفرعي (اختياري)' : 'Subcategory (Optional)' }}</label>
             <select class="form-select" [(ngModel)]="discountData.subCategoryId">
               <option value="">-- {{ ts.currentLang() === 'ar' ? 'الكل' : 'All' }} --</option>
               @for (sub of availableSubCats; track sub._id) {
                 <option [value]="sub._id">{{ ts.localize(sub.name) }}</option>
               }
             </select>
          </div>
       </div>
       }

       @if (discountData.applyTo === 'product') {
       <div class="form-group">
          <label class="form-label">{{ ts.currentLang() === 'ar' ? 'اختر المنتج' : 'Select Product' }}</label>
          <select class="form-select" [(ngModel)]="discountData.productId">
             <option value="">--</option>
             @for (prod of products; track prod._id) {
               <option [value]="prod._id">{{ ts.localize(prod.name) }}</option>
             }
          </select>
       </div>
       }

       <div class="mt-4 flex-end">
          <button class="btn btn-primary" (click)="applyDiscount()" [disabled]="isLoading">
             {{ isLoading ? '...' : (ts.currentLang() === 'ar' ? 'تطبيق الخصم الآن' : 'Apply Discount Now') }}
          </button>
       </div>
    </div>

    <div class="page-header mt-5">
      <h2 class="page-title">{{ ts.currentLang() === 'ar' ? 'المنتجات المخفضة حالياً' : 'Currently Discounted Products' }}</h2>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>{{ ts.currentLang() === 'ar' ? 'المنتج' : 'Product' }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'الخصم' : 'Discount' }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'ينتهي في' : 'Expires At' }}</th>
            <th>{{ 'dash.actions' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          @for (prod of discountedProducts; track prod._id) {
            <tr>
              <td>{{ ts.localize(prod.name) }}</td>
              <td><span class="badge badge-success">{{ prod.discountPercentage }}%</span></td>
              <td dir="ltr">{{ prod.discountExpiry | date:'short' }}</td>
              <td>
                <button class="btn btn-ghost btn-sm text-danger" (click)="removeDiscount(prod)">
                   {{ ts.currentLang() === 'ar' ? 'إلغاء الخصم' : 'Remove' }}
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .page-title { font-size: 26px; font-weight: 700; }
    .card { background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); }
    .p-4 { padding: 24px; }
    .mb-3 { margin-bottom: 16px; }
    .mt-3 { margin-top: 16px; }
    .mt-4 { margin-top: 24px; }
    .mt-5 { margin-top: 48px; }
    .flex-end { display: flex; justify-content: flex-end; }
    .row-group { display: flex; gap: 16px; }
    .w-33 { flex: 0.33; }
    .w-50 { flex: 0.5; }
    .radio-group { display: flex; gap: 24px; align-items: center; padding-top: 8px; }
    .radio-group label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    .form-select { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); outline: none; background: var(--surface); color: var(--text); }
  `]
})
export class Discounts implements OnInit {
  ts = inject(TranslationService);
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  toastService = inject(ToastService);

  products: Product[] = [];
  categories: Category[] = [];
  availableSubCats: any[] = [];
  
  isLoading = false;

  discountData = {
    percentage: null as number | null,
    expiry: '',
    applyTo: 'product',
    categoryId: '',
    subCategoryId: '',
    productId: ''
  };

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.categoryService.getCategories().subscribe(c => this.categories = c);
    this.productService.getAdminProducts().subscribe(p => this.products = p);
  }

  get discountedProducts() {
    // Only products that have > 0 discount and valid expiry
    return this.products.filter(p => p.discountPercentage && p.discountPercentage > 0 && new Date(p.discountExpiry as string) > new Date());
  }

  onCategorySelect() {
    const cat = this.categories.find(c => c._id === this.discountData.categoryId);
    this.availableSubCats = cat ? cat.subCategories : [];
    this.discountData.subCategoryId = '';
  }

  async applyDiscount() {
    if (!this.discountData.percentage || this.discountData.percentage <= 0 || this.discountData.percentage > 100) {
       this.toastService.show(this.ts.currentLang() === 'ar' ? 'نسبة الخصم غير صحيحة' : 'Invalid percentage', 'error');
       return;
    }
    if (!this.discountData.expiry) {
       this.toastService.show(this.ts.currentLang() === 'ar' ? 'تاريخ الانتهاء مطلوب' : 'Expiry date required', 'error');
       return;
    }

    this.isLoading = true;
    let targets = [...this.products];

    if (this.discountData.applyTo === 'category') {
       if (!this.discountData.categoryId) {
          this.toastService.show('Please select a category', 'error');
          this.isLoading = false;
          return;
       }
       targets = targets.filter(p => typeof p.category === 'object' ? (p.category as any)._id === this.discountData.categoryId : p.category === this.discountData.categoryId);
       if (this.discountData.subCategoryId) {
          targets = targets.filter(p => typeof p.subCategory === 'object' ? (p.subCategory as any)._id === this.discountData.subCategoryId : p.subCategory === this.discountData.subCategoryId);
       }
    } else if (this.discountData.applyTo === 'product') {
       if (!this.discountData.productId) {
         this.toastService.show('Please select a product', 'error');
         this.isLoading = false;
         return;
       }
       targets = targets.filter(p => p._id === this.discountData.productId);
    }

    // Execute updates sequentially or Promise.all. 
    // Since ProductService uses FormData for updateProduct, we'll construct dummy FormData just with discount
    try {
      const promises = targets.map(p => {
         const data = new FormData();
         data.append('discountPercentage', this.discountData.percentage!.toString());
         data.append('discountExpiry', this.discountData.expiry);
         return new Promise((resolve, reject) => {
             this.productService.updateProduct(p._id, data).subscribe({
                next: resolve,
                error: reject
             });
         });
      });
      await Promise.all(promises);
      this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم تطبيق الخصم بنجاح' : 'Discounts applied successfully', 'success');
      this.loadData();
    } catch(err) {
      this.toastService.show('Error applying discounts', 'error');
    }
    this.isLoading = false;
  }

  removeDiscount(product: Product) {
     const data = new FormData();
     data.append('discountPercentage', '0');
     data.append('discountExpiry', new Date().toISOString()); // Expire immediately
     this.productService.updateProduct(product._id, data).subscribe({
         next: () => {
             this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم إلغاء الخصم' : 'Discount removed', 'success');
             this.loadData();
         },
         error: () => this.toastService.show('Error removing discount', 'error')
     });
  }
}
