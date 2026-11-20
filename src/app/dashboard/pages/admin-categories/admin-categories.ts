import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ImgUrlPipe } from '../../../shared/pipes/img-url.pipe';
import { FallbackImageDirective } from '../../../shared/directives/fallback-image.directive';
import { CategoryService } from '../../../core/services/category.service';
import { Category } from '../../../core/models/category.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ImgUrlPipe, FallbackImageDirective],
  template: `
    <div class="page-header" style="flex-wrap: wrap; gap: 12px;">
      <h1 class="page-title">{{ 'dash.categories' | translate }}</h1>
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
         <input type="text" class="form-input" style="min-width: 250px;" 
                [placeholder]="ts.currentLang() === 'ar' ? 'بحث عن قسم...' : 'Search categories...'"
                [(ngModel)]="searchQuery" (ngModelChange)="filterCategories()">
         <button class="btn btn-primary btn-sm" (click)="openModal()">+ {{ ts.currentLang() === 'ar' ? 'إضافة قسم' : 'Add Category' }}</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-container">
      <div class="tabs-wrapper">
        <button [class.tab-active]="activeTab === 'active'" (click)="setTab('active')" class="tab-btn">
           {{ ts.currentLang() === 'ar' ? 'الأقسام النشطة' : 'Active Categories' }}
        </button>
        <button [class.tab-active]="activeTab === 'archived'" (click)="setTab('archived')" class="tab-btn">
           {{ ts.currentLang() === 'ar' ? 'الأقسام المؤرشفة' : 'Archived Categories' }}
        </button>
      </div>
    </div>
    
    <div class="cat-grid">
      @if (filteredCategories.length === 0) {
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
           {{ ts.currentLang() === 'ar' ? 'لا يوجد أقسام' : 'No categories found' }}
        </div>
      }
      @for (cat of filteredCategories; track cat._id) {
        <div class="cat-card card">
          <img [src]="cat.image | imgUrl" [alt]="ts.localize(cat.name)" class="cat-img">
          <h3>{{ ts.localize(cat.name) }}</h3>
          <div class="sub-list">
            @for (sub of cat.subCategories; track sub._id) {
              <span class="badge badge-info">{{ ts.localize(sub.name) }}</span>
            }
          </div>
          <div class="cat-actions flex-center">
            @if (activeTab === 'active') {
              <button class="btn btn-ghost btn-sm" (click)="openModal(cat)">{{ 'dash.edit' | translate }}</button>
              <button class="btn btn-ghost btn-sm text-danger" (click)="deleteCategory(cat)">{{ ts.currentLang() === 'ar' ? 'أرشفة' : 'Archive' }}</button>
            } @else {
              <button class="btn btn-primary btn-sm" (click)="restoreCategory(cat)">{{ ts.currentLang() === 'ar' ? 'استرجاع' : 'Restore' }}</button>
            }
          </div>
        </div>
      }
    </div>

    <!-- Category Modal -->
    @if (isModalOpen) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ isEditMode ? (ts.currentLang() === 'ar' ? 'تعديل قسم' : 'Edit Category') : (ts.currentLang() === 'ar' ? 'إضافة قسم' : 'Add Category') }}</h2>
            <button class="modal-close" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            
            <div class="form-group row-group">
               <div class="w-50">
                  <label class="form-label">{{ ts.currentLang() === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)' }}</label>
                  <input type="text" class="form-input" [(ngModel)]="formData.nameAr">
               </div>
               <div class="w-50">
                  <label class="form-label">{{ ts.currentLang() === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)' }}</label>
                  <input type="text" class="form-input" [(ngModel)]="formData.nameEn">
               </div>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" style="margin-bottom: 0;">{{ ts.currentLang() === 'ar' ? 'صورة القسم (اختياري)' : 'Category Image (Optional)' }}</label>
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

            <div class="form-group">
               <label class="form-label">{{ ts.currentLang() === 'ar' ? 'الأقسام الفرعية (مفصولة بفاصلة)' : 'Subcategories (comma separated)' }}</label>
               <div class="row-group mb-1">
                 <input type="text" class="form-input w-50" placeholder="العربي" [(ngModel)]="tempSubAr">
                 <input type="text" class="form-input w-50" placeholder="English" [(ngModel)]="tempSubEn">
                 <button class="btn btn-outline" (click)="addSubCategory()">{{ ts.currentLang() === 'ar' ? 'إضافة' : 'Add' }}</button>
               </div>
               
               <div class="sub-list" style="justify-content: flex-start;">
                 @for (sub of formData.subCategories; track $index) {
                   <span class="badge badge-info flex-center">
                     {{ ts.currentLang() === 'ar' ? sub.name.ar : sub.name.en }}
                     <button type="button" class="btn-clear ml-1" (click)="removeSubCategory($index)">x</button>
                   </span>
                 }
               </div>
            </div>

            <div class="modal-actions mt-3">
              <button class="btn btn-ghost" (click)="closeModal()" [disabled]="isLoading">{{ 'dash.cancel' | translate }}</button>
              <button class="btn btn-primary" (click)="submitCategory()" [disabled]="isLoading">{{ isLoading ? '...' : ('dash.save' | translate) }}</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .page-title { font-size: 26px; font-weight: 700; }
    .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .cat-card { text-align: center; }
    .cat-img { width: 100%; height: 140px; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: 12px; }
    .cat-card h3 { font-size: 16px; font-weight: 600; margin-bottom: 10px; }
    .sub-list { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 12px; }
    .cat-actions { display: flex; justify-content: center; gap: 8px; }
    
    .tabs-container { margin-bottom: 24px; border-bottom: 1px solid var(--border); }
    .tabs-wrapper { display: flex; gap: 24px; }
    .tab-btn { background: none; border: none; font-size: 15px; font-weight: 500; color: var(--text-muted); padding: 12px 4px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
    .tab-btn:hover { color: var(--text); }
    .tab-active { color: var(--primary); border-bottom-color: var(--primary); }
    
    .row-group { display: flex; gap: 12px; }
    .w-50 { flex: 1; }
    .mb-1 { margin-bottom: 8px; }
    .mt-3 { margin-top: 24px; }
    .flex-center { display: inline-flex; align-items: center; }
    .ml-1 { margin-left: 6px; }
    .btn-clear { background: transparent; border: none; color: inherit; cursor: pointer; font-size: 12px; font-weight: bold;}
    .modal-actions { display: flex; justify-content: flex-end; gap: 12px; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-content { background: var(--bg-card); border-radius: var(--radius); max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
    .modal-header h2 { font-size: 18px; font-weight: 600; }
    .modal-close { font-size: 18px; color: var(--text-muted); background: transparent; border: none; cursor: pointer; }
    .modal-body { padding: 20px; }
  `]
})
export class AdminCategories implements OnInit {
  ts = inject(TranslationService);
  categoryService = inject(CategoryService);
  confirmService = inject(ConfirmService);
  toastService = inject(ToastService);
  
  categories: Category[] = [];
  filteredCategories: Category[] = [];
  searchQuery = '';
  activeTab: 'active' | 'archived' = 'active';
  
  // Modal state
  isModalOpen = false;
  isEditMode = false;
  isLoading = false;
  currentCatId: string | null = null;
  selectedFile: File | null = null;
  imageUrl = '';
  previewUrl = '';
  imageSourceType: 'file' | 'url' = 'file';
  
  // Form state
  formData = {
    nameAr: '',
    nameEn: '',
    subCategories: [] as {name: {ar: string, en: string}}[]
  };
  
  tempSubAr = '';
  tempSubEn = '';

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.categoryService.getCategories('?includeDeleted=true').subscribe(c => {
      this.categories = c;
      this.filterCategories();
    });
  }

  setTab(tab: 'active' | 'archived') {
    this.activeTab = tab;
    this.filterCategories();
  }

  filterCategories() {
    let temp = this.categories;
    
    if (this.activeTab === 'archived') {
      temp = temp.filter(c => c.isDeleted === true);
    } else {
      temp = temp.filter(c => !c.isDeleted);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      temp = temp.filter(c => 
        (c.name?.en && c.name.en.toLowerCase().includes(q)) || 
        (c.name?.ar && c.name.ar.includes(q))
      );
    }
    this.filteredCategories = temp;
  }

  openModal(cat?: Category) {
    this.isModalOpen = true;
    this.selectedFile = null;
    this.tempSubAr = '';
    this.tempSubEn = '';
    
    if (cat) {
      this.isEditMode = true;
      this.currentCatId = cat._id;
      this.formData = {
        nameAr: cat.name.ar,
        nameEn: cat.name.en,
        subCategories: cat.subCategories.map(sub => ({ name: { ar: sub.name.ar, en: sub.name.en } }))
      };
      if (cat.image) {
        this.previewUrl = cat.image;
        this.imageUrl = cat.image;
        this.imageSourceType = (cat.image.startsWith('http://') || cat.image.startsWith('https://')) ? 'url' : 'file';
      } else {
        this.previewUrl = '';
        this.imageUrl = '';
        this.imageSourceType = 'file';
      }
    } else {
      this.isEditMode = false;
      this.currentCatId = null;
      this.formData = { nameAr: '', nameEn: '', subCategories: [] };
      this.previewUrl = '';
      this.imageUrl = '';
      this.imageSourceType = 'file';
    }
  }

  closeModal() {
    this.isModalOpen = false;
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

  addSubCategory() {
    if (this.tempSubAr.trim() && this.tempSubEn.trim()) {
      this.formData.subCategories.push({
        name: { ar: this.tempSubAr.trim(), en: this.tempSubEn.trim() }
      });
      this.tempSubAr = '';
      this.tempSubEn = '';
    } else {
      this.toastService.show(this.ts.currentLang() === 'ar' ? 'يرجى إدخال اسم القسم الفرعي باللغتين' : 'Please enter subcategory in both languages', 'error');
    }
  }

  removeSubCategory(index: number) {
    this.formData.subCategories.splice(index, 1);
  }

  submitCategory() {
    if (!this.formData.nameAr || !this.formData.nameEn) {
      this.toastService.show(this.ts.currentLang() === 'ar' ? 'الاسم مطلوب' : 'Name is required', 'error');
      return;
    }

    this.isLoading = true;
    
    // We send data as FormData because of the image
    const data = new FormData();
    data.append('name[ar]', this.formData.nameAr);
    data.append('name[en]', this.formData.nameEn);
    
    // Add subCategories correctly
    this.formData.subCategories.forEach((sub, i) => {
      data.append(`subCategories[${i}][name][ar]`, sub.name.ar);
      data.append(`subCategories[${i}][name][en]`, sub.name.en);
    });

    if (this.imageSourceType === 'file' && this.selectedFile) {
      data.append('image', this.selectedFile);
    } else if (this.imageSourceType === 'url' && this.imageUrl.trim()) {
      data.append('image', this.imageUrl.trim());
      data.append('imageUrl', this.imageUrl.trim());
    } else if (this.isEditMode && this.previewUrl && !this.selectedFile) {
      data.append('image', this.previewUrl);
      data.append('imageUrl', this.previewUrl);
    }

    if (this.isEditMode) {
      this.categoryService.updateCategory(this.currentCatId!, data as any).subscribe({
        next: () => {
          this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم التعديل' : 'Category updated', 'success');
          this.loadCategories();
          this.closeModal();
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.toastService.show('Error updating category', 'error');
        }
      });
    } else {
      this.categoryService.addCategory(data as any).subscribe({
        next: () => {
          this.toastService.show(this.ts.currentLang() === 'ar' ? 'تمت الإضافة' : 'Category added', 'success');
          this.loadCategories();
          this.closeModal();
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.toastService.show('Error adding category', 'error');
        }
      });
    }
  }

  async deleteCategory(cat: Category) {
    const confirmed = await this.confirmService.ask(
      this.ts.currentLang() === 'ar' 
        ? `هل أنت متأكد من أرشفة "${this.ts.localize(cat.name)}"؟ سيتم أيضاً إخفاء كافة المنتجات المرتبطة به.`
        : `Archive category "${this.ts.localize(cat.name)}"? All its products will also be hidden from users.`,
      'danger'
    );
    if (confirmed) {
      this.categoryService.deleteCategory(cat._id).subscribe({
        next: () => {
          this.toastService.show(this.ts.currentLang() === 'ar' ? 'تمت الأرشفة' : 'Archived successfully', 'success');
          this.loadCategories();
        },
        error: () => this.toastService.show('Error archiving category', 'error')
      });
    }
  }

  async restoreCategory(cat: Category) {
     const confirmed = await this.confirmService.ask(
         this.ts.currentLang() === 'ar' ? `هل تفضل استرجاع القسم "${this.ts.localize(cat.name)}"؟` : `Restore "${this.ts.localize(cat.name)}"?`,
         'warning'
     );
     if (confirmed) {
         const data = new FormData();
         data.append('isDeleted', 'false');

         this.categoryService.updateCategory(cat._id, data as any).subscribe({
             next: () => {
                 this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم إرجاع القسم بنجاح' : 'Category restored', 'success');
                 this.loadCategories();
             },
             error: () => this.toastService.show('Error restoring category', 'error')
         })
     }
  }
}
