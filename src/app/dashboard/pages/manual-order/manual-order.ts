import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ProductService } from '../../../core/services/product.service';
import { OrderService } from '../../../core/services/order.service';
import { Product, ProductSize } from '../../../core/models/product.model';
import { ToastService } from '../../../core/services/toast.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface CartItem {
  product: Product;
  size?: ProductSize;
  quantity: number;
}

@Component({
  selector: 'app-manual-order',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ ts.currentLang() === 'ar' ? 'إنشاء طلب يدوي' : 'Create Manual Order' }}</h1>
    </div>

    <div class="manual-order-grid">
       <!-- LEFT: Product Search & List -->
       <div class="mo-card mo-products">
          <h3>{{ ts.currentLang() === 'ar' ? 'المنتجات' : 'Products' }}</h3>
          
          <input type="text" class="form-input mb-3" 
                 [placeholder]="ts.currentLang() === 'ar' ? 'بحث باسم المنتج...' : 'Search product...'"
                 [(ngModel)]="searchQuery" (ngModelChange)="filterProducts()">

          <div class="product-list">
             @for (p of filteredProducts; track p._id) {
                <div class="mo-product-card" (click)="selectProduct(p)">
                   <strong>{{ ts.localize(p.name) }}</strong>
                   <span class="stock-badge" [class.danger]="p.stock === 0">{{ p.stock }} {{ 'dash.stock' | translate }}</span>
                </div>
             }
          </div>
       </div>

       <!-- MIDDLE: Cart items -->
       <div class="mo-card mo-cart">
          <h3>{{ ts.currentLang() === 'ar' ? 'عناصر الطلب' : 'Order Items' }}</h3>

          @if (cart.length === 0) {
             <p class="empty-txt">{{ ts.currentLang() === 'ar' ? 'اختر منتجات لتبدأ' : 'Select products to start' }}</p>
          }

          <div class="cart-items">
             @for (item of cart; track item.product._id + (item.size?.label || ''); let i = $index) {
                <div class="cart-item">
                   <div class="ci-info">
                      <strong>{{ ts.localize(item.product.name) }}</strong>
                      <small>{{ item.size ? item.size.label + ' - ' + item.size.price : item.product.price }} EGP</small>
                   </div>
                   <div class="ci-actions">
                      <input type="number" min="1" [max]="item.product.stock" class="form-input qty-input" [(ngModel)]="item.quantity" (ngModelChange)="calcTotal()">
                      <button class="btn btn-sm btn-danger btn-outline" (click)="removeItem(i)">✕</button>
                   </div>
                </div>
             }
          </div>

          <div class="mo-total">
             <strong>{{ 'cart.total' | translate }}:</strong>
             <strong class="text-primary">{{ total.toLocaleString() }} EGP</strong>
          </div>
       </div>

       <!-- RIGHT: Customer Data & Submit -->
       <div class="mo-card mo-checkout">
          <h3>{{ ts.currentLang() === 'ar' ? 'بيانات العميل' : 'Customer Info' }}</h3>
          
          <div class="form-group">
            <label class="form-label">{{ ts.currentLang() === 'ar' ? 'اسم العميل' : 'Customer Name' }} *</label>
            <input type="text" class="form-input" [(ngModel)]="orderData.customerName">
          </div>
          <div class="form-group">
            <label class="form-label">{{ 'checkout.phone' | translate }} *</label>
            <input type="text" class="form-input" [(ngModel)]="orderData.phone">
          </div>
          <div class="form-group">
            <label class="form-label">{{ 'checkout.governorate' | translate }}</label>
            <input type="text" class="form-input" [(ngModel)]="orderData.governorate">
          </div>
          <div class="form-group">
            <label class="form-label">{{ 'checkout.address' | translate }}</label>
            <input type="text" class="form-input" [(ngModel)]="orderData.address">
          </div>
          <div class="form-group">
            <label class="form-label">{{ 'checkout.notes' | translate }}</label>
            <input type="text" class="form-input" [(ngModel)]="orderData.notes">
          </div>

          <button class="btn btn-primary w-100 mt-4" (click)="submitOrder()" [disabled]="isLoading || cart.length === 0">
             {{ isLoading ? '...' : (ts.currentLang() === 'ar' ? 'حفظ الطلب' : 'Save Order') }}
          </button>
       </div>
    </div>

    <!-- Size Selection Modal -->
    @if (selectedProductForSize) {
      <div class="modal-overlay" (click)="selectedProductForSize = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3 style="margin-bottom: 16px;">{{ ts.currentLang() === 'ar' ? 'اختر المقاس' : 'Select Size' }}</h3>
          <div class="size-options">
             @for (size of selectedProductForSize.sizes; track size.label) {
                <button class="btn btn-outline" (click)="addToCartFromSize(selectedProductForSize, size)" style="width: 100%; margin-bottom: 8px; justify-content: space-between;">
                   <span>{{ size.label }}</span>
                   <span>{{ size.price }} EGP</span>
                </button>
             }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 26px; font-weight: 700; }
    .manual-order-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; align-items: start; }
    .mo-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
    .mo-card h3 { margin-bottom: 16px; font-size: 18px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
    .mb-3 { margin-bottom: 16px; }
    .mt-4 { margin-top: 24px; }
    .w-100 { width: 100%; }
    
    .product-list { max-height: 500px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
    .mo-product-card { padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; display: flex; justify-content: space-between; transition: 0.2s; }
    .mo-product-card:hover { border-color: var(--primary); background: var(--bg-card-hover); }
    .stock-badge { font-size: 11px; background: var(--bg-input); color: var(--text-muted); padding: 2px 6px; border-radius: 10px; }
    .stock-badge.danger { background: rgba(239, 68, 68, 0.15); color: var(--danger); }

    .cart-items { max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .cart-item { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border); padding-bottom: 12px; }
    .ci-info { display: flex; flex-direction: column; }
    .ci-actions { display: flex; gap: 8px; align-items: center; }
    .qty-input { width: 60px; text-align: center; padding: 4px; }
    .empty-txt { color: var(--text-muted); text-align: center; padding: 40px 0; }
    .mo-total { display: flex; justify-content: space-between; font-size: 18px; border-top: 2px solid var(--border); padding-top: 16px; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-content { background: var(--bg-card); border-radius: var(--radius); max-width: 400px; width: 100%; padding: 20px; }
    @media (max-width: 1024px) { .manual-order-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 768px) { .manual-order-grid { grid-template-columns: 1fr; } }
  `]
})
export class ManualOrder implements OnInit {
  ts = inject(TranslationService);
  productService = inject(ProductService);
  orderService = inject(OrderService);
  toastService = inject(ToastService);
  http = inject(HttpClient);

  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  searchQuery = '';

  cart: CartItem[] = [];
  total = 0;
  
  selectedProductForSize: Product | null = null;
  isLoading = false;

  orderData = {
    customerName: '',
    phone: '',
    governorate: '',
    address: '',
    notes: ''
  };

  ngOnInit() {
    this.productService.getAdminProducts().subscribe(p => {
       this.allProducts = p;
       this.filteredProducts = p;
    });
  }

  filterProducts() {
     if (!this.searchQuery.trim()) {
        this.filteredProducts = this.allProducts;
        return;
     }
     const q = this.searchQuery.toLowerCase();
     this.filteredProducts = this.allProducts.filter(p => 
        (p.name?.en && p.name.en.toLowerCase().includes(q)) || 
        (p.name?.ar && p.name.ar.includes(q))
     );
  }

  selectProduct(p: Product) {
     if (p.stock <= 0) return;
     if (p.sizes && p.sizes.length > 0) {
        if (p.sizes.length === 1) {
           this.addToCartFromSize(p, p.sizes[0]);
        } else {
           this.selectedProductForSize = p;
        }
     } else {
        this.addToCartFromSize(p, undefined);
     }
  }

  addToCartFromSize(product: Product, size?: ProductSize) {
     const ext = this.cart.find(c => c.product._id === product._id && (size ? c.size?.label === size.label : !c.size));
     const currentQty = ext ? ext.quantity : 0;
     
     if (currentQty + 1 > product.stock) {
        this.toastService.show(
           this.ts.currentLang() === 'ar' ? 'المخزون غير كافي' : 'Insufficient stock',
           'error'
        );
        return;
     }

     if (ext) {
         ext.quantity++;
     } else {
         this.cart.push({ product, size, quantity: 1 });
     }
     this.selectedProductForSize = null;
     this.calcTotal();
  }

  removeItem(idx: number) {
     this.cart.splice(idx, 1);
     this.calcTotal();
  }

  calcTotal() {
     // Validate quantities against stock
     this.cart.forEach(item => {
       if (item.quantity > item.product.stock) {
         item.quantity = item.product.stock;
         this.toastService.show(
           this.ts.currentLang() === 'ar' ? 'تم تعديل الكمية لتناسب المخزون المتاح' : 'Quantity adjusted to match available stock',
           'info'
         );
       }
       if (item.quantity < 1) item.quantity = 1;
     });

     this.total = this.cart.reduce((sum, item) => sum + ((item.size ? item.size.price : item.product.price) * item.quantity), 0);
  }

  submitOrder() {
     if (!this.orderData.customerName || !this.orderData.phone) {
        this.toastService.show(this.ts.currentLang() === 'ar' ? 'اسم العميل ورقم الهاتف مطلوبين' : 'Customer Name and Phone are required', 'error');
        return;
     }
     if (this.cart.length === 0) return;

     this.isLoading = true;
     const payload = {
         customerName: this.orderData.customerName,
         phone: this.orderData.phone,
         governorate: this.orderData.governorate,
         address: this.orderData.address,
         notes: this.orderData.notes,
         totalPrice: this.total,
         items: this.cart.map(c => ({
            product: c.product._id,
            size: c.size?.label,
            price: (c.size ? c.size.price : c.product.price) * c.quantity,
            quantity: c.quantity
         }))
     };

     this.http.post(`${environment.apiUrl}orders/manual`, payload).subscribe({
        next: () => {
           this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم إنشاء الطلب بنجاح' : 'Manual order created', 'success');
           this.cart = [];
           this.calcTotal();
           this.orderData = { customerName: '', phone: '', governorate: '', address: '', notes: '' };
           this.isLoading = false;
        },
         error: (err) => {
            this.isLoading = false;
            if (err.error?.errors && err.error?.errors.length > 0) {
               const errMsg = err.error.errors[0].message;
               const msg = typeof errMsg === 'object' ? (this.ts.currentLang() === 'ar' ? (errMsg.ar || errMsg.en) : (errMsg.en || errMsg.ar)) : errMsg;
               this.toastService.show(msg, 'error');
               return;
            }
            this.toastService.show('Error creating order', 'error');
         }
     });
  }
}
