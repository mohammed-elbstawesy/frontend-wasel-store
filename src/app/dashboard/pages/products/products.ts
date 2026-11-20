import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ImgUrlPipe } from '../../../shared/pipes/img-url.pipe';
import { FallbackImageDirective } from '../../../shared/directives/fallback-image.directive';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { Product } from '../../../core/models/product.model';
import { Category } from '../../../core/models/category.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { SocketService } from '../../../core/services/socket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ImgUrlPipe, FallbackImageDirective],
  template: `
    <div class="page-header" style="flex-wrap: wrap; gap: 12px;">
      <h1 class="page-title">{{ 'dash.products' | translate }}</h1>
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
         <input type="text" class="form-input" style="min-width: 200px;" 
                [placeholder]="ts.currentLang() === 'ar' ? 'بحث باسم المنتج...' : 'Search by name...'"
                [(ngModel)]="searchQuery" (ngModelChange)="filterProducts()">
         <select class="form-input" style="min-width: 150px;" [(ngModel)]="filterCategoryId" (change)="onFilterCategoryChange()">
           <option value="">{{ ts.currentLang() === 'ar' ? 'كل الأقسام' : 'All Categories' }}</option>
           @for (cat of categories; track cat._id) {
             <option [value]="cat._id">{{ ts.localize(cat.name) }}</option>
           }
         </select>
         <select class="form-input" style="min-width: 160px;" [(ngModel)]="filterSubCategoryId" (change)="filterProducts()" [disabled]="!availableFilterSubCategories.length">
           <option value="">{{ ts.currentLang() === 'ar' ? 'كل الأقسام الفرعية' : 'All Subcategories' }}</option>
           @for (sub of availableFilterSubCategories; track sub._id) {
             <option [value]="sub._id">{{ ts.localize(sub.name) }}</option>
           }
         </select>
         <button class="btn btn-primary btn-sm" (click)="openModal()">
           + {{ 'dash.add_product' | translate }}
         </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-container">
      <div class="tabs-wrapper">
        <button [class.tab-active]="activeTab === 'active'" (click)="setTab('active')" class="tab-btn">
           {{ ts.currentLang() === 'ar' ? 'المنتجات النشطة' : 'Active Products' }}
        </button>
        <button [class.tab-active]="activeTab === 'archived'" (click)="setTab('archived')" class="tab-btn">
           {{ ts.currentLang() === 'ar' ? 'المنتجات المحذوفة (الأرشيف)' : 'Archived Products' }}
        </button>
      </div>
    </div>

    <div class="table-wrapper mt-3">
      <table>
        <thead>
          <tr>
            <th>{{ ts.currentLang() === 'ar' ? 'الصورة' : 'Image' }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'الاسم' : 'Name' }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'السعر (الأساسي)' : 'Base Price' }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'مميز' : 'Top' }}</th>
            <th>{{ 'dash.stock' | translate }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'الاحجام' : 'Sizes' }}</th>
            <th>{{ 'dash.actions' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          @if (filteredProducts.length === 0) {
            <tr>
               <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
                  {{ ts.currentLang() === 'ar' ? 'لا يوجد منتجات' : 'No products found' }}
               </td>
            </tr>
          }
          @for (product of filteredProducts; track product._id) {
            <tr>
              <td><img [src]="product.images[0] | imgUrl" class="table-img" [alt]="ts.localize(product.name)"></td>
              <td class="name-col">{{ ts.localize(product.name) }}</td>
              <td class="price-col">{{ product.price.toLocaleString() }} {{ 'product.egp' | translate }}</td>
              <td>
                <span class="badge" [class.badge-warning]="product.isTopSelling">{{ product.isTopSelling ? '⭐️' : '-' }}</span>
              </td>
              <td>
                @if (product.stock === 0) {
                  <span class="badge badge-danger">0</span>
                } @else if (product.stock < 10) {
                  <span class="badge badge-warning">{{ product.stock }}</span>
                } @else {
                  <span class="badge badge-success">{{ product.stock }}</span>
                }
              </td>
              <td>{{ product.sizes?.length || 0 }}</td>
              <td>
                <div class="action-btns">
                  @if (activeTab === 'active') {
                    <button class="btn btn-ghost btn-sm" (click)="openModal(product)">{{ 'dash.edit' | translate }}</button>
                    <button class="btn btn-ghost btn-sm text-danger" (click)="deleteProduct(product)">{{ ts.currentLang() === 'ar' ? 'أرشفة' : 'Archive' }}</button>
                  } @else {
                    <button class="btn btn-primary btn-sm" (click)="restoreProduct(product)">{{ ts.currentLang() === 'ar' ? 'استرجاع' : 'Restore' }}</button>
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    @if (isModalOpen) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ isEditMode ? (ts.currentLang() === 'ar' ? 'تعديل منتج' : 'Edit Product') : ('dash.add_product' | translate) }}</h2>
            <button class="modal-close" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            
            <div class="form-group row-group">
               <div class="w-50">
                  <label class="form-label">{{ ts.currentLang() === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)' }} *</label>
                  <input type="text" class="form-input" [(ngModel)]="formData.nameAr">
               </div>
               <div class="w-50">
                  <label class="form-label">{{ ts.currentLang() === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)' }} *</label>
                  <input type="text" class="form-input" [(ngModel)]="formData.nameEn">
               </div>
            </div>

            <div class="form-group row-group">
               <div class="w-50">
                  <label class="form-label">{{ ts.currentLang() === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)' }} *</label>
                  <textarea class="form-input" [(ngModel)]="formData.descAr"></textarea>
               </div>
               <div class="w-50">
                  <label class="form-label">{{ ts.currentLang() === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)' }} *</label>
                  <textarea class="form-input" [(ngModel)]="formData.descEn"></textarea>
               </div>
            </div>

            <div class="form-group row-group">
              <div class="w-33">
                <label class="form-label">{{ ts.currentLang() === 'ar' ? 'منتج مميز (الأكثر مبيعاً)' : 'Top Selling' }}</label>
                <div style="padding-top: 8px;">
                   <input type="checkbox" [(ngModel)]="formData.isTopSelling"> {{ ts.currentLang() === 'ar' ? 'عرض بالرئيسية' : 'Show on Home' }}
                </div>
              </div>
              <div class="w-33">
                <label class="form-label">{{ ts.currentLang() === 'ar' ? 'القسم' : 'Category' }} *</label>
                <select class="form-select" [(ngModel)]="formData.category" (change)="onCategoryChange()">
                  <option value="">{{ ts.currentLang() === 'ar' ? 'اختر القسم' : 'Select Category' }}</option>
                  @for (cat of categories; track cat._id) {
                    <option [value]="cat._id">{{ ts.localize(cat.name) }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Subcategory -->
            <div class="form-group row-group">
               <div class="w-100">
                 <label class="form-label">{{ ts.currentLang() === 'ar' ? 'القسم الفرعي' : 'Subcategory' }} *</label>
                 <select class="form-select" [(ngModel)]="formData.subCategory">
                   <option value="">{{ ts.currentLang() === 'ar' ? 'اختر القسم الفرعي' : 'Select Subcategory' }}</option>
                   @for (sub of availableSubCategories; track sub._id) {
                     <option [value]="sub._id">{{ ts.localize(sub.name) }}</option>
                   }
                  </select>
               </div>
            </div>

            <!-- Product Image Selection (File or URL) -->
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" style="margin-bottom: 0;">{{ ts.currentLang() === 'ar' ? 'صورة المنتج' : 'Product Image' }}</label>
                <div class="img-mode-pills">
                  <button type="button" class="img-pill" [class.active]="imageSourceType === 'file'" (click)="setImageSourceType('file')">
                    📁 {{ ts.currentLang() === 'ar' ? 'من الجهاز' : 'Upload File' }}
                  </button>
                  <button type="button" class="img-pill" [class.active]="imageSourceType === 'url'" (click)="setImageSourceType('url')">
                    🔗 {{ ts.currentLang() === 'ar' ? 'رابط مباشر (URL)' : 'Image URL' }}
                  </button>
                </div>
              </div>

              @if (imageSourceType === 'file') {
                <input type="file" class="form-input" (change)="onFileChange($event)" accept="image/*">
              } @else {
                <input type="url" class="form-input" [(ngModel)]="imageUrl" (ngModelChange)="onUrlChange()" 
                       [placeholder]="ts.currentLang() === 'ar' ? 'ضع رابط الصورة هنا (مثال: https://...)' : 'Paste image URL here (https://...)'">
              }

              <!-- Image Preview -->
              @if (previewUrl) {
                <div class="img-preview-box">
                  <img [src]="previewUrl | imgUrl" class="img-preview-thumb" alt="Preview">
                  <div class="img-preview-info">
                    <span class="img-preview-name">{{ imageSourceType === 'file' ? (selectedFile?.name || (ts.currentLang() === 'ar' ? 'صورة محفوظة' : 'Saved Image')) : imageUrl }}</span>
                    <button type="button" class="btn-clear-img" (click)="clearImage()">✕ {{ ts.currentLang() === 'ar' ? 'إزالة' : 'Remove' }}</button>
                  </div>
                </div>
              }
            </div>

            <!-- Sizes (Required) -->
            <div class="form-group">
               <label class="form-label">{{ ts.currentLang() === 'ar' ? 'الأحجام (مطلوب حجم واحد على الأقل)' : 'Sizes (At least 1 required)' }} *</label>
               <div class="row-group mb-1" style="align-items: flex-end;">
                 <div class="w-33">
                   <label class="form-label" style="font-size: 12px; margin-bottom: 4px;">{{ ts.currentLang() === 'ar' ? 'الاسم (مثال: كبير)' : 'Name (e.g. Large)' }}</label>
                   <input type="text" class="form-input" [placeholder]="ts.currentLang() === 'ar' ? 'الاسم' : 'Label'" [(ngModel)]="tempSizeLabel" (keyup.enter)="addSize()">
                 </div>
                 <div class="w-33">
                   <label class="form-label" style="font-size: 12px; margin-bottom: 4px;">{{ ts.currentLang() === 'ar' ? 'السعر' : 'Price' }}</label>
                   <input type="number" min="0" class="form-input" [placeholder]="ts.currentLang() === 'ar' ? 'السعر' : 'Price'" [(ngModel)]="tempSizePrice" (keyup.enter)="addSize()">
                 </div>
                 <div class="w-33">
                   <label class="form-label" style="font-size: 12px; margin-bottom: 4px;">{{ ts.currentLang() === 'ar' ? 'الكمية' : 'Stock' }}</label>
                   <input type="number" min="0" class="form-input" [placeholder]="ts.currentLang() === 'ar' ? 'الكمية' : 'Stock'" [(ngModel)]="tempSizeStock" (keyup.enter)="addSize()">
                 </div>
                 <button class="btn btn-primary" style="height: 44px; margin-bottom: 0px;" (click)="addSize()">{{ ts.currentLang() === 'ar' ? 'إضافة' : 'Add' }}</button>
               </div>
               
               <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 16px;">
                 @for (size of formData.sizes; track $index) {
                   <div style="display: flex; gap: 12px; align-items: center; background: var(--bg-secondary); padding: 8px; border-radius: 8px;">
                      <div class="w-33">
                        <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">{{ ts.currentLang() === 'ar' ? 'الاسم' : 'Label' }}</label>
                        <input type="text" class="form-input" [(ngModel)]="size.label" [placeholder]="ts.currentLang() === 'ar' ? 'الاسم' : 'Label'">
                      </div>
                      <div class="w-33">
                        <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">{{ ts.currentLang() === 'ar' ? 'السعر' : 'Price' }}</label>
                        <input type="number" class="form-input" [(ngModel)]="size.price" [placeholder]="ts.currentLang() === 'ar' ? 'السعر' : 'Price'">
                      </div>
                      <div class="w-33">
                        <label class="form-label" style="font-size: 11px; margin-bottom: 4px;">{{ ts.currentLang() === 'ar' ? 'الكمية' : 'Stock' }}</label>
                        <input type="number" min="0" class="form-input" [(ngModel)]="size.stock" [placeholder]="ts.currentLang() === 'ar' ? 'الكمية' : 'Stock'">
                      </div>
                      <button type="button" class="btn btn-outline text-danger" style="padding: 10px 14px; margin-top: 20px;" (click)="removeSize($index)">✕</button>
                   </div>
                 }
               </div>
               @if (formData.sizes.length === 0) {
                 <p style="color: var(--danger); font-size: 12px; margin-top: 8px;">{{ ts.currentLang() === 'ar' ? 'يجب إضافة حجم واحد على الأقل' : 'At least one size is required' }}</p>
               }
            </div>

            <div class="modal-actions mt-3">
              <button class="btn btn-ghost" (click)="closeModal()" [disabled]="isLoading">{{ 'dash.cancel' | translate }}</button>
              <button class="btn btn-primary" (click)="submitProduct()" [disabled]="isLoading">{{ isLoading ? '...' : ('dash.save' | translate) }}</button>
            </div>

          </div>
        </div>
      </div>
    }

  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .page-title { font-size: 26px; font-weight: 700; }
    .table-img { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; }
    .name-col { font-weight: 500; max-width: 200px; }
    .price-col { font-weight: 600; color: var(--primary); }
    .action-btns { display: flex; gap: 4px; }
    
    .tabs-container { margin-bottom: 16px; border-bottom: 1px solid var(--border); }
    .tabs-wrapper { display: flex; gap: 24px; }
    .tab-btn { background: none; border: none; font-size: 15px; font-weight: 500; color: var(--text-muted); padding: 12px 4px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
    .tab-btn:hover { color: var(--text); }
    .tab-active { color: var(--primary); border-bottom-color: var(--primary); }

    .row-group { display: flex; gap: 12px; }
    .w-50 { flex: 1; }
    .w-33 { flex: 0.33; }
    .mb-1 { margin-bottom: 8px; }
    .mt-3 { margin-top: 24px; }
    .flex-center { display: inline-flex; align-items: center; }
    .ml-1 { margin-left: 6px; }
    .btn-clear { background: transparent; border: none; color: inherit; cursor: pointer; font-size: 12px; font-weight: bold;}
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-content { background: var(--bg-card); border-radius: var(--radius); max-width: 650px; width: 100%; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
    .modal-header h2 { font-size: 18px; font-weight: 600; }
    .modal-close { font-size: 18px; color: var(--text-muted); background: transparent; border: none; cursor: pointer; }
    .modal-body { padding: 20px; }
    .form-select { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius-sm); outline: none; background: var(--surface); color: var(--text); }
    @media (max-width: 768px) {
      .row-group { flex-direction: column; gap: 0; }
      .w-50, .w-33 { flex: unset; width: 100%; }
      .page-header { flex-direction: column; align-items: flex-start; }
      .tabs-wrapper { gap: 8px; }
      .tab-btn { font-size: 13px; padding: 10px 2px; }
      .modal-content { max-width: 100%; }
      .modal-body { padding: 14px; }
      .table-img { width: 36px; height: 36px; }
    }
  `]
})
export class AdminProducts implements OnInit, OnDestroy {
  ts = inject(TranslationService);
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  confirmService = inject(ConfirmService);
  toastService = inject(ToastService);
  socketService = inject(SocketService);

  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchQuery = '';
  filterCategoryId = '';
  filterSubCategoryId = '';
  availableFilterSubCategories: any[] = [];

  categories: Category[] = [];
  availableSubCategories: any[] = [];

  activeTab: 'active' | 'archived' = 'active';

  // Modal State
  isModalOpen = false;
  isEditMode = false;
  isLoading = false;
  currentProductId: string | null = null;
  selectedFile: File | null = null;
  imageUrl = '';
  previewUrl = '';
  imageSourceType: 'file' | 'url' = 'file';
  private subs: Subscription[] = [];

  formData = {
    nameAr: '', nameEn: '',
    descAr: '', descEn: '',
    price: 0,
    category: '',
    subCategory: '',
    isTopSelling: false,
    sizes: [] as { label: string, price: number, stock: number }[]
  };

  tempSizeLabel = '';
  tempSizeStock = 0;
  tempSizePrice = 0;

  ngOnInit() {
    this.loadProducts();
    this.categoryService.getCategories().subscribe(c => this.categories = c);

    // Socket: real-time product updates
    this.subs.push(
      this.socketService.listen('product_created').subscribe(() => this.loadProducts())
    );
    this.subs.push(
      this.socketService.listen('product_updated').subscribe(() => this.loadProducts())
    );
    this.subs.push(
      this.socketService.listen('product_deleted').subscribe(() => this.loadProducts())
    );
    this.subs.push(
      this.socketService.listen('stock_updated').subscribe(() => this.loadProducts())
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  setTab(tab: 'active' | 'archived') {
    this.activeTab = tab;
    this.filterProducts();
  }

  loadProducts() {
    this.isLoading = true;
    this.productService.getAdminProducts('?includeDeleted=true').subscribe({
      next: (p) => {
        this.products = p;
        this.filterProducts();
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  onFilterCategoryChange() {
    this.filterSubCategoryId = '';
    const selectedCat = this.categories.find(c => c._id === this.filterCategoryId);
    this.availableFilterSubCategories = selectedCat ? selectedCat.subCategories : [];
    this.filterProducts();
  }

  filterProducts() {
    let temp = this.products;

    // Filter by Tab (Archived/Active)
    if (this.activeTab === 'archived') {
      temp = temp.filter(p => p.isDeleted === true);
    } else {
      temp = temp.filter(p => !p.isDeleted);
    }

    if (this.filterCategoryId) {
      temp = temp.filter(p => {
        const catId = typeof p.category === 'object' ? (p.category as any)._id : p.category;
        return catId === this.filterCategoryId;
      });
    }

    if (this.filterSubCategoryId) {
      temp = temp.filter(p => {
        const subId = typeof p.subCategory === 'object' ? (p.subCategory as any)._id : p.subCategory;
        return subId === this.filterSubCategoryId;
      });
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      temp = temp.filter(p =>
        (p.name?.en && p.name.en.toLowerCase().includes(q)) ||
        (p.name?.ar && p.name.ar.includes(q))
      );
    }

    this.filteredProducts = temp;
  }

  openModal(product?: Product) {
    this.isModalOpen = true;
    this.selectedFile = null;
    this.tempSizeLabel = '';
    this.tempSizeStock = 0;
    this.tempSizePrice = 0;

    if (product) {
      this.isEditMode = true;
      this.currentProductId = product._id;

      this.formData = {
        nameAr: product.name?.ar || '',
        nameEn: product.name?.en || '',
        descAr: product.description?.ar || '',
        descEn: product.description?.en || '',
        price: product.price || 0,
        category: typeof product.category === 'object' ? (product.category as any)._id : product.category,
        subCategory: typeof product.subCategory === 'object' ? (product.subCategory as any)._id : product.subCategory,
        isTopSelling: product.isTopSelling || false,
        sizes: product.sizes ? product.sizes.map(s => ({ label: s.label, price: s.price, stock: s.stock || 0 })) : []
      };
      if (product.images && product.images.length > 0) {
        this.previewUrl = product.images[0];
        this.imageUrl = product.images[0];
        this.imageSourceType = (product.images[0].startsWith('http://') || product.images[0].startsWith('https://')) ? 'url' : 'file';
      } else {
        this.previewUrl = '';
        this.imageUrl = '';
        this.imageSourceType = 'file';
      }
      this.onCategoryChange(); // Load subcategories for selected category
    } else {
      this.isEditMode = false;
      this.currentProductId = null;
      this.formData = {
        nameAr: '', nameEn: '', descAr: '', descEn: '',
        price: 0, category: '', subCategory: '', isTopSelling: false, sizes: []
      };
      this.availableSubCategories = [];
      this.previewUrl = '';
      this.imageUrl = '';
      this.imageSourceType = 'file';
    }
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onCategoryChange() {
    const selectedCat = this.categories.find(c => c._id === this.formData.category);
    this.availableSubCategories = selectedCat ? selectedCat.subCategories : [];
    // Reset subcategory ONLY if it's not present in the new list to preserve it during Edit load
    if (!this.availableSubCategories.find(s => s._id === this.formData.subCategory)) {
      this.formData.subCategory = '';
    }
  }

  setImageSourceType(type: 'file' | 'url') {
    this.imageSourceType = type;
    if (type === 'url' && this.imageUrl) {
      this.previewUrl = this.imageUrl.trim();
    } else if (type === 'file' && this.selectedFile) {
      this.previewUrl = URL.createObjectURL(this.selectedFile);
    }
  }

  onFileChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
      if (this.selectedFile) {
        this.previewUrl = URL.createObjectURL(this.selectedFile);
      }
    }
  }

  onUrlChange() {
    this.previewUrl = this.imageUrl ? this.imageUrl.trim() : '';
  }

  clearImage() {
    this.selectedFile = null;
    this.imageUrl = '';
    this.previewUrl = '';
  }

  addSize() {
    if (this.tempSizeLabel && this.tempSizePrice > 0) {
      this.formData.sizes.push({
        label: this.tempSizeLabel,
        price: this.tempSizePrice,
        stock: this.tempSizeStock || 0
      });
      this.tempSizeLabel = '';
      this.tempSizePrice = 0;
      this.tempSizeStock = 0;
    } else {
      this.toastService.show(this.ts.currentLang() === 'ar' ? 'الرجاء إدخال اسم الحجم والسعر' : 'Please enter size label and price', 'error');
    }
  }

  removeSize(index: number) {
    this.formData.sizes.splice(index, 1);
  }

  submitProduct() {
    if (!this.formData.nameAr || !this.formData.nameEn) {
      this.toastService.show(this.ts.currentLang() === 'ar' ? 'يرجى كتابة اسم المنتج باللغتين' : 'Please provide product name', 'error');
      return;
    }
    if (!this.formData.category) {
      this.toastService.show(this.ts.currentLang() === 'ar' ? 'يرجى اختيار القسم' : 'Please select a category', 'error');
      return;
    }
    if (!this.formData.subCategory) {
      this.toastService.show(this.ts.currentLang() === 'ar' ? 'يرجى اختيار القسم الفرعي' : 'Please select a subcategory', 'error');
      return;
    }
    if (this.formData.sizes.length === 0) {
      this.toastService.show(this.ts.currentLang() === 'ar' ? 'يجب إضافة حجم واحد على الأقل مع الكمية' : 'At least one size with stock is required', 'error');
      return;
    }

    // Auto-compute base price from the lowest size price
    this.formData.price = Math.min(...this.formData.sizes.map(s => s.price));

    this.isLoading = true;

    // Use FormData for file upload
    const data = new FormData();
    data.append('name', JSON.stringify({ ar: this.formData.nameAr, en: this.formData.nameEn }));
    data.append('description', JSON.stringify({ ar: this.formData.descAr, en: this.formData.descEn }));
    data.append('price', this.formData.price.toString());
    data.append('category', this.formData.category);
    data.append('subCategory', this.formData.subCategory);
    data.append('isTopSelling', this.formData.isTopSelling.toString());
    data.append('sizes', JSON.stringify(this.formData.sizes));



    if (this.imageSourceType === 'file' && this.selectedFile) {
      data.append('images', this.selectedFile); // Multer expects 'images' for products array 
    } else if (this.imageSourceType === 'url' && this.imageUrl.trim()) {
      data.append('images', JSON.stringify([this.imageUrl.trim()]));
      data.append('imageUrl', this.imageUrl.trim());
    } else if (this.isEditMode && this.previewUrl && !this.selectedFile) {
      data.append('images', JSON.stringify([this.previewUrl]));
      data.append('imageUrl', this.previewUrl);
    }

    if (this.isEditMode && this.currentProductId) {
      this.productService.updateProduct(this.currentProductId, data).subscribe({
        next: () => {
          this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم التعديل' : 'Product updated', 'success');
          this.loadProducts();
          this.closeModal();
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.toastService.show('Error updating product', 'error');
        }
      });
    } else {
      this.productService.addProduct(data).subscribe({
        next: () => {
          this.toastService.show(this.ts.currentLang() === 'ar' ? 'تمت الإضافة' : 'Product added', 'success');
          this.loadProducts();
          this.closeModal();
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.toastService.show('Error adding product', 'error');
        }
      });
    }
  }

  async deleteProduct(product: Product) {
    const confirmed = await this.confirmService.ask(
      this.ts.currentLang() === 'ar'
        ? `هل أنت متأكد من أرشفة "${this.ts.localize(product.name)}"؟ لن يظهر هذا المنتج للمستخدمين ولكن سيتم حفظه في الطلبات.`
        : `Are you sure you want to archive "${this.ts.localize(product.name)}"? It won't be visible to users but kept for order history.`,
      'danger'
    );
    if (confirmed) {
      this.productService.deleteProduct(product._id).subscribe({
        next: () => {
          this.toastService.show(this.ts.currentLang() === 'ar' ? 'تمت الأرشفة بنجاح' : 'Product Archived', 'success');
          // No need to manually update state if socket handles it, but if it doesn't we rely on loadProducts inside subscribe
          this.loadProducts();
        },
        error: () => this.toastService.show('Error archiving product', 'error')
      });
    }
  }

  async restoreProduct(product: Product) {
    const confirmed = await this.confirmService.ask(
      this.ts.currentLang() === 'ar' ? `هل تفضل استرجاع "${this.ts.localize(product.name)}"؟` : `Restore "${this.ts.localize(product.name)}"?`,
      'warning'
    );
    if (confirmed) {
      // Use FormData to match the standard updateProduct expectation, although we only update isDeleted
      const data = new FormData();
      data.append('isDeleted', 'false');

      this.productService.updateProduct(product._id, data).subscribe({
        next: () => {
          this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم إرجاع المنتج بنجاح' : 'Product restored', 'success');
          this.loadProducts();
        },
        error: () => this.toastService.show('Error restoring product', 'error')
      })
    }
  }
}
