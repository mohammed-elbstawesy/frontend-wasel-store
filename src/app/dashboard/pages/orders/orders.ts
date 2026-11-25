import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { Order } from '../../../core/models/order.model';
import { Product } from '../../../core/models/product.model';
import { SocketService } from '../../../core/services/socket.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
  <div class="page-header">
      <h1 class="page-title">{{ 'dash.orders' | translate }}</h1>
      <input type="text" class="form-input" style="max-width: 300px; flex: 1;"
             [placeholder]="ts.currentLang() === 'ar' ? 'بحث بالاسم، أو رقم الهاتف...' : 'Search by name, or phone...'"
             [(ngModel)]="searchQuery" (ngModelChange)="applyFilter()">
    </div>

    <!-- Orders Internal Navbar -->
    <div class="orders-nav">
      <button [class.active]="currentTab === 'pending'" (click)="setTab('pending')">
        ⏳ {{ ts.currentLang() === 'ar' ? 'بانتظار التأكيد' : 'Pending' }}
        <span class="badge badge-neutral">{{ getCount('pending') }}</span>
      </button>
      <button [class.active]="currentTab === 'confirmed'" (click)="setTab('confirmed')">
        📦 {{ ts.currentLang() === 'ar' ? 'تم التأكيد' : 'Confirmed' }}
        <span class="badge badge-info">{{ getCount('confirmed') }}</span>
      </button>
      <button [class.active]="currentTab === 'shipped'" (click)="setTab('shipped')">
        🚚 {{ ts.currentLang() === 'ar' ? 'قيد الشحن' : 'Shipped' }}
        <span class="badge badge-primary" style="background: rgba(139, 92, 246, 0.15); color: var(--accent);">{{ getCount('shipped') }}</span>
      </button>
      <button [class.active]="currentTab === 'delivered'" (click)="setTab('delivered')">
        ✅ {{ ts.currentLang() === 'ar' ? 'تم التوصيل' : 'Delivered' }}
        <span class="badge badge-success">{{ getCount('delivered') }}</span>
      </button>
      <button [class.active]="currentTab === 'cancelled'" (click)="setTab('cancelled')">
        ❌ {{ ts.currentLang() === 'ar' ? 'ملغاة' : 'Cancelled' }}
        <span class="badge badge-danger">{{ getCount('cancelled') }}</span>
      </button>
    </div>

    <!-- New Order Notification -->
    @if (newOrderAlert) {
      <div class="new-order-alert animate-fadeIn">
        🔔 {{ 'dash.new_order' | translate }}
        <button (click)="newOrderAlert = false">✕</button>
      </div>
    }

    @if (filteredOrders.length > 0) {
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{{ 'dash.customer' | translate }}</th>
              <th>{{ 'checkout.phone' | translate }}</th>
              <th>{{ 'checkout.governorate' | translate }}</th>
              <th>{{ ts.currentLang() === 'ar' ? 'المنتجات' : 'Items' }}</th>
              <th>{{ 'cart.total' | translate }}</th>
              <th>{{ 'dash.status' | translate }}</th>
              <th>{{ 'dash.actions' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (order of filteredOrders; track order._id) {
              <tr class="animate-fadeIn">
                <td class="order-id">{{ order._id.slice(-6) }}</td>
                <td>{{ getCustomerName(order) }}</td>
                <td dir="ltr">{{ order.phone }}</td>
                <td>{{ order.governorate }}</td>
                <td>{{ order.items.length }} {{ ts.currentLang() === 'ar' ? 'منتج' : 'items' }}</td>
                <td class="price-col">{{ order.totalPrice.toLocaleString() }} {{ 'product.egp' | translate }}</td>
                <td>
                  <div style="display:flex; flex-direction:column; gap:4px; max-width: 140px;">
                     <span class="badge" [ngClass]="getStatusClass(order.status)" style="text-align:center;">{{ ts.t('dash.' + order.status) }}</span>
                     @if (order.status === 'pending') {
                       <button class="btn btn-sm btn-primary" (click)="updateStatus(order._id, 'confirmed')">{{ ts.currentLang() === 'ar' ? 'تأكيد الطلب' : 'Confirm' }}</button>
                       <button class="btn btn-sm btn-outline btn-danger" (click)="updateStatus(order._id, 'cancelled')">{{ ts.currentLang() === 'ar' ? 'إلغاء' : 'Cancel' }}</button>
                     }
                     @if (order.status === 'confirmed') {
                       <button class="btn btn-sm btn-primary" (click)="updateStatus(order._id, 'shipped')">{{ ts.currentLang() === 'ar' ? 'شحن الطلب' : 'Ship Order' }}</button>
                       <button class="btn btn-sm btn-outline btn-danger" (click)="updateStatus(order._id, 'cancelled')" style="margin-top: 4px;">{{ ts.currentLang() === 'ar' ? 'إلغاء' : 'Cancel' }}</button>
                     }
                     @if (order.status === 'shipped') {
                       <button class="btn btn-sm btn-success" (click)="updateStatus(order._id, 'delivered')">{{ ts.currentLang() === 'ar' ? 'تم التوصيل' : 'Delivered' }}</button>
                       <button class="btn btn-sm btn-outline btn-danger" (click)="updateStatus(order._id, 'cancelled')" style="margin-top: 4px;">{{ ts.currentLang() === 'ar' ? 'إلغاء' : 'Cancel' }}</button>
                     }
                  </div>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm" (click)="openDetails(order)">
                    {{ 'dash.order_details' | translate }}
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="empty-state">
        <p>{{ ts.currentLang() === 'ar' ? 'لا توجد طلبات' : 'No orders found' }}</p>
      </div>
    }

    <!-- Order Details Modal -->
    @if (selectedOrder) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-content modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ 'dash.order_details' | translate }} #{{ selectedOrder._id.slice(-6) }}
              @if (isEditing) {
                <span class="edit-mode-badge">{{ ts.currentLang() === 'ar' ? 'وضع التعديل' : 'Edit Mode' }}</span>
              }
            </h2>
            <button class="modal-close" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">

            <!-- Customer Info -->
            <div class="detail-row"><strong>{{ 'dash.customer' | translate }}:</strong> {{ getCustomerName(selectedOrder) }}</div>

            @if (isEditing) {
              <!-- Editable Fields -->
              <div class="edit-field">
                <label>{{ 'checkout.phone' | translate }}</label>
                <input type="text" class="form-input" [(ngModel)]="editData.phone" dir="ltr">
              </div>
              <div class="edit-field">
                <label>{{ 'checkout.governorate' | translate }}</label>
                <input type="text" class="form-input" [(ngModel)]="editData.governorate">
              </div>
              <div class="edit-field">
                <label>{{ 'checkout.address' | translate }}</label>
                <input type="text" class="form-input" [(ngModel)]="editData.address">
              </div>
              <div class="edit-field">
                <label>{{ 'checkout.notes' | translate }}</label>
                <textarea class="form-input" [(ngModel)]="editData.notes" rows="2"></textarea>
              </div>
            } @else {
              <!-- Read-Only Fields -->
              <div class="detail-row"><strong>{{ 'checkout.phone' | translate }}:</strong> {{ selectedOrder.phone }}</div>
              <div class="detail-row"><strong>{{ 'checkout.governorate' | translate }}:</strong> {{ selectedOrder.governorate }}</div>
              <div class="detail-row"><strong>{{ 'checkout.address' | translate }}:</strong> {{ selectedOrder.address }}</div>
              @if (selectedOrder.notes) {
                <div class="detail-row"><strong>{{ 'checkout.notes' | translate }}:</strong> {{ selectedOrder.notes }}</div>
              }
            }

            <!-- Items Section -->
            <h3 class="mt-2 items-section-title">{{ ts.currentLang() === 'ar' ? 'المنتجات' : 'Items' }}</h3>
            <div class="items-list">
              @for (item of (isEditing ? editData.items : selectedOrder.items); track $index) {
                <div class="item-row">
                  <div class="item-info">
                    <span class="item-name">{{ getProductName(item.product) }}</span>
                    <span class="item-meta">
                      @if (item.size) { {{ item.size }} }
                      @if (isEditing) {
                        × <input type="number" class="qty-edit-input" [(ngModel)]="item.quantity" min="1" (ngModelChange)="recalcItemPrice(item, $index)">
                      } @else {
                        × {{ item.quantity }}
                      }
                    </span>
                  </div>
                  <div class="item-right">
                    <span class="item-price">{{ item.price.toLocaleString() }} {{ 'product.egp' | translate }}</span>
                    @if (isEditing) {
                      <button class="remove-item-btn" (click)="removeEditItem($index)" title="Remove">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Add Product (Edit Mode) -->
            @if (isEditing) {
              <div class="add-product-section">
                <div class="add-product-search">
                  <input type="text" class="form-input" [(ngModel)]="productSearchQuery"
                     [placeholder]="ts.currentLang() === 'ar' ? 'ابحث عن منتج لإضافته...' : 'Search product to add...'"
                     (input)="filterProducts()">
                </div>
                @if (productSearchQuery && filteredProducts.length > 0) {
                  <div class="product-dropdown">
                    @for (p of filteredProducts; track p._id) {
                      <div class="product-option" (click)="selectProductToAdd(p)">
                        <span class="product-option-name">{{ getProductDisplayName(p) }}</span>
                        <span class="product-option-stock">{{ ts.currentLang() === 'ar' ? 'المخزون:' : 'Stock:' }} {{ p.stock }}</span>
                      </div>
                    }
                  </div>
                }
                @if (selectedProductToAdd) {
                  <div class="add-product-form">
                    <div class="add-product-info">
                      <strong>{{ getProductDisplayName(selectedProductToAdd) }}</strong>
                    </div>
                    <div class="add-product-controls">
                      @if (selectedProductToAdd.sizes && selectedProductToAdd.sizes.length > 0) {
                        <select class="form-input form-input-sm" [(ngModel)]="addItemSize">
                          <option value="">{{ ts.currentLang() === 'ar' ? 'اختر المقاس' : 'Select Size' }}</option>
                          @for (size of selectedProductToAdd.sizes; track size.label) {
                            <option [value]="size.label">{{ size.label }} — {{ size.price }} {{ ts.currentLang() === 'ar' ? 'ج.م' : 'EGP' }}</option>
                          }
                        </select>
                      }
                      <input type="number" class="form-input form-input-sm" [(ngModel)]="addItemQty" min="1" [max]="selectedProductToAdd.stock" style="width: 70px;">
                      <button class="btn btn-sm btn-primary" (click)="addItemToOrder()" 
                          [disabled]="(selectedProductToAdd.sizes && selectedProductToAdd.sizes.length > 0 && !addItemSize) || addItemQty < 1">
                        {{ ts.currentLang() === 'ar' ? 'أضف' : 'Add' }}
                      </button>
                      <button class="btn btn-sm btn-ghost" (click)="selectedProductToAdd = null; productSearchQuery = ''">✕</button>
                    </div>
                  </div>
                }
              </div>
            }

            @if (!isEditing && selectedOrder) {
              @if (selectedOrder.subtotal !== undefined) {
                <div style="display:flex; justify-content:space-between; font-size:13px; color:var(--text-muted); margin-top:10px;">
                  <span>{{ ts.currentLang() === 'ar' ? 'المجموع الفرعي' : 'Subtotal' }}</span>
                  <span>{{ selectedOrder.subtotal.toLocaleString() }} {{ 'product.egp' | translate }}</span>
                </div>
              }
              @if (selectedOrder.discountAmount && selectedOrder.discountAmount > 0) {
                <div style="display:flex; justify-content:space-between; font-size:13px; color:var(--success); margin-top:4px;">
                  <span>{{ ts.currentLang() === 'ar' ? 'خصم الكوبون' : 'Discount' }} ({{ selectedOrder.couponCode }})</span>
                  <span>-{{ selectedOrder.discountAmount.toLocaleString() }} {{ 'product.egp' | translate }}</span>
                </div>
              }
              @if (selectedOrder.shippingFee !== undefined) {
                <div style="display:flex; justify-content:space-between; font-size:13px; color:var(--text-muted); margin-top:4px;">
                  <span>{{ ts.currentLang() === 'ar' ? 'مصاريف الشحن' : 'Shipping' }}</span>
                  <span>{{ selectedOrder.shippingFee === 0 ? (ts.currentLang() === 'ar' ? 'مجاني' : 'Free') : (selectedOrder.shippingFee.toLocaleString() + ' ' + ('product.egp' | translate)) }}</span>
                </div>
              }
            }

            <div class="modal-total">
              <strong>{{ 'cart.total' | translate }}:</strong>
              <strong class="text-primary">{{ getEditTotal().toLocaleString() }} {{ 'product.egp' | translate }}</strong>
            </div>

            <!-- Action Buttons -->
            @if (selectedOrder.status === 'pending') {
              <div class="modal-actions">
                @if (isEditing) {
                  <button class="btn btn-primary" (click)="saveOrderEdit()" [disabled]="saving">
                    @if (saving) {
                      <span class="spinner-sm"></span>
                    }
                    {{ ts.currentLang() === 'ar' ? 'حفظ التغييرات' : 'Save Changes' }}
                  </button>
                  <button class="btn btn-outline" (click)="cancelEdit()">{{ ts.currentLang() === 'ar' ? 'إلغاء التعديل' : 'Cancel' }}</button>
                } @else {
                  <button class="btn btn-primary" (click)="startEdit()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    {{ ts.currentLang() === 'ar' ? 'تعديل الطلب' : 'Edit Order' }}
                  </button>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .page-title { font-size: 26px; font-weight: 700; }
    .filter-select { width: auto; min-width: 160px; padding: 8px 12px; }
    .new-order-alert {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 20px; background: rgba(34, 197, 94, 0.15); border: 1px solid var(--success);
      border-radius: var(--radius-sm); margin-bottom: 16px; font-weight: 600; color: var(--success);
    }
    .new-order-alert button { background: none; border: none; cursor: pointer; font-size: 16px; color: var(--success); }
    .order-id { font-family: monospace; font-weight: 600; }
    .price-col { font-weight: 600; color: var(--primary); }
    .status-select { padding: 4px 8px; font-size: 12px; border-radius: 100px; min-width: 100px; }
    .empty-state { text-align: center; padding: 60px; color: var(--text-muted); }
    .orders-nav { display: flex; gap: 8px; background: var(--bg-card); padding: 12px; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 20px; overflow-x: auto; scrollbar-width: none; }
    .orders-nav::-webkit-scrollbar { display: none; }
    .orders-nav button { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: none; background: transparent; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600; color: var(--text-secondary); white-space: nowrap; transition: all 0.2s; }
    .orders-nav button:hover { background: rgba(0,0,0,0.03); }
    .orders-nav button.active { background: var(--surface); color: var(--primary); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .orders-nav button .badge { padding: 2px 6px; font-size: 11px; }
    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-content { background: var(--bg-card); border-radius: var(--radius); max-width: 500px; width: 100%; max-height: 85vh; overflow-y: auto; }
    .modal-content.modal-lg { max-width: 650px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
    .modal-header h2 { font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
    .modal-close { font-size: 20px; color: var(--text-muted); background: none; border: none; cursor: pointer; }
    .modal-body { padding: 20px; }
    .detail-row { padding: 6px 0; font-size: 14px; }
    .items-list { margin: 12px 0; }
    .item-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; gap: 12px; }
    .item-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .item-name { font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item-meta { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
    .item-right { display: flex; align-items: center; gap: 8px; }
    .item-price { font-weight: 600; color: var(--primary); white-space: nowrap; }
    .modal-total { display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid var(--border); font-size: 16px; margin-top: 12px; }

    /* Edit Mode Styles */
    .edit-mode-badge { font-size: 11px; padding: 3px 10px; background: rgba(245, 158, 11, 0.15); color: var(--warning); border-radius: 100px; font-weight: 600; }
    .edit-field { margin: 8px 0; }
    .edit-field label { display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; }
    .edit-field .form-input { width: 100%; }
    .items-section-title { font-size: 15px; font-weight: 700; margin-top: 16px; margin-bottom: 4px; }
    .qty-edit-input { width: 50px; padding: 2px 6px; border: 1px solid var(--border); border-radius: var(--radius-sm); text-align: center; font-size: 13px; }
    .remove-item-btn { background: rgba(239, 68, 68, 0.15); border: none; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--danger); transition: all 0.2s; }
    .remove-item-btn:hover { background: rgba(239, 68, 68, 0.3); }
    .add-product-section { margin-top: 12px; padding: 12px; background: var(--bg-input); border-radius: var(--radius-sm); border: 1px dashed var(--border); }
    .add-product-search { margin-bottom: 8px; }
    .product-dropdown { max-height: 180px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-input); margin-bottom: 8px; }
    .product-option { padding: 10px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 13px; border-bottom: 1px solid var(--border); transition: background 0.15s; }
    .product-option:hover { background: var(--bg-card-hover); }
    .product-option:last-child { border-bottom: none; }
    .product-option-name { font-weight: 600; }
    .product-option-stock { font-size: 12px; color: var(--text-muted); }
    .add-product-form { padding: 10px; background: var(--bg-input); border-radius: var(--radius-sm); border: 1px solid var(--border); }
    .add-product-info { margin-bottom: 8px; font-size: 14px; }
    .add-product-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .form-input-sm { padding: 6px 10px !important; font-size: 13px !important; }
    .modal-actions { display: flex; gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
    .modal-actions .btn { display: flex; align-items: center; gap: 6px; }
    .spinner-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) {
      .page-title { font-size: 20px; }
      .orders-nav { gap: 4px; padding: 8px; }
      .orders-nav button { padding: 8px 12px; font-size: 13px; gap: 4px; }
      table { font-size: 13px; }
      table th, table td { padding: 8px 6px; }
      .modal-content { max-width: 100%; margin: 8px; }
      .modal-header h2 { font-size: 16px; }
      .add-product-controls { flex-direction: column; align-items: stretch; }
    }
  `]
})
export class Orders implements OnInit, OnDestroy {
  ts = inject(TranslationService);
  orderService = inject(OrderService);
  productService = inject(ProductService);
  socketService = inject(SocketService);

  orders: Order[] = [];
  filteredOrders: Order[] = [];
  searchQuery = '';
  currentTab: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' = 'pending';
  selectedOrder: Order | null = null;
  newOrderAlert = false;
  private subs: Subscription[] = [];

  // Edit mode state
  isEditing = false;
  saving = false;
  editData: any = {};
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  productSearchQuery = '';
  selectedProductToAdd: Product | null = null;
  addItemSize = '';
  addItemQty = 1;

  ngOnInit() {
    // Load orders initially
    this.orderService.getOrders().subscribe();

    // Load all products for the search dropdown
    this.productService.getAdminProducts().subscribe(prods => this.allProducts = prods);

    this.subs.push(
      this.orderService.orders$.subscribe(orders => {
        this.orders = orders;
        this.applyFilter();
      })
    );

    // Socket: listen for new orders in real-time
    this.subs.push(
      this.socketService.listen('new_order').subscribe((order: Order) => {
        if (order) {
          const exists = this.orders.find(o => o._id === order._id);
          if (!exists) {
            this.orders = [order, ...this.orders];
            this.applyFilter();
          }
          this.newOrderAlert = true;
        }
      })
    );

    // Socket: listen for order status updates
    this.subs.push(
      this.socketService.listen('order_updated').subscribe((updatedOrder: Order) => {
        if (updatedOrder) {
          this.orders = this.orders.map(o => o._id === updatedOrder._id ? updatedOrder : o);
          this.applyFilter();
        }
      })
    );

    // Fallback polling when deployed on serverless (Vercel) where WebSockets are inactive
    this.subs.push(
      this.socketService.pollInServerless(20000).subscribe(() => {
        const previousIds = new Set(this.orders.map(o => o._id));
        this.orderService.getOrders().subscribe(latestOrders => {
          if (previousIds.size > 0 && latestOrders.some(o => !previousIds.has(o._id))) {
            this.newOrderAlert = true;
          }
        });
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  setTab(tab: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled') {
    this.currentTab = tab;
    this.applyFilter();
  }

  getCount(status: string): number {
    return this.orders.filter(o => o.status === status).length;
  }

  applyFilter() {
    let result = this.orders.filter(o => {
      if (this.currentTab === 'pending') return o.status === 'pending';
      if (this.currentTab === 'confirmed') return o.status === 'confirmed';
      if (this.currentTab === 'shipped') return o.status === 'shipped';
      if (this.currentTab === 'delivered') return o.status === 'delivered';
      if (this.currentTab === 'cancelled') return o.status === 'cancelled';
      return true;
    });

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(o => {
        const nameMatch = this.getCustomerName(o).toLowerCase().includes(q);
        const phoneMatch = o.phone && o.phone.toLowerCase().includes(q);
        return nameMatch || phoneMatch;
      });
    }
    
    this.filteredOrders = result;
  }

  updateStatus(orderId: string, status: Order['status']) {
    this.orderService.updateOrderStatus(orderId, status).subscribe();
  }

  getStatusClass(status: string): string {
    const m: Record<string, string> = { pending: 'badge-warning', confirmed: 'badge-info', shipped: 'badge-info', delivered: 'badge-success', cancelled: 'badge-danger' };
    return m[status] || '';
  }

  getCustomerName(order: any): string {
    if (order.user?.firstName) {
      return `${order.user.firstName} ${order.user.lastName || ''}`.trim();
    }
    if (order.customerName) {
      return order.customerName;
    }
    return 'N/A';
  }

  getProductName(product: any): string {
    if (typeof product === 'string') return product;
    if (product?.name) {
      return this.ts.currentLang() === 'ar' ? (product.name.ar || product.name.en) : (product.name.en || product.name.ar);
    }
    return 'N/A';
  }

  getProductDisplayName(product: Product): string {
    return this.ts.currentLang() === 'ar' ? (product.name.ar || product.name.en) : (product.name.en || product.name.ar);
  }

  // --- Modal ---
  openDetails(order: Order) {
    this.selectedOrder = order;
    this.isEditing = false;
    this.productSearchQuery = '';
    this.selectedProductToAdd = null;
  }

  closeModal() {
    this.selectedOrder = null;
    this.isEditing = false;
  }

  // --- Edit Mode ---
  startEdit() {
    if (!this.selectedOrder) return;
    this.isEditing = true;
    this.editData = {
      address: this.selectedOrder.address,
      phone: this.selectedOrder.phone,
      governorate: this.selectedOrder.governorate,
      notes: this.selectedOrder.notes || '',
      items: this.selectedOrder.items.map(item => ({
        product: item.product,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        _unitPrice: item.quantity > 0 ? item.price / item.quantity : item.price
      }))
    };
  }

  cancelEdit() {
    this.isEditing = false;
    this.productSearchQuery = '';
    this.selectedProductToAdd = null;
  }

  recalcItemPrice(item: any, index: number) {
    if (item.quantity < 1) item.quantity = 1;
    item.price = Math.round(item._unitPrice * item.quantity * 100) / 100;
  }

  removeEditItem(index: number) {
    this.editData.items.splice(index, 1);
  }

  filterProducts() {
    if (!this.productSearchQuery.trim()) {
      this.filteredProducts = [];
      return;
    }
    const q = this.productSearchQuery.toLowerCase();
    this.filteredProducts = this.allProducts
      .filter(p => p.stock > 0 && (
        p.name.en.toLowerCase().includes(q) ||
        p.name.ar.includes(this.productSearchQuery.trim())
      ))
      .slice(0, 8);
  }

  selectProductToAdd(product: Product) {
    this.selectedProductToAdd = product;
    this.addItemSize = product.sizes && product.sizes.length > 0 ? product.sizes[0].label : '';
    this.addItemQty = 1;
    this.productSearchQuery = '';
    this.filteredProducts = [];
  }

  addItemToOrder() {
    if (!this.selectedProductToAdd) return;
    const product = this.selectedProductToAdd;
    let unitPrice = product.price;
    if (product.sizes && product.sizes.length > 0) {
      if (!this.addItemSize) return;
      const size = product.sizes.find(s => s.label === this.addItemSize);
      if (!size) return;
      unitPrice = size.price;
    }

    if (product.discountPercentage && product.discountPercentage > 0) {
      unitPrice = unitPrice * (1 - product.discountPercentage / 100);
    }

    this.editData.items.push({
      product: { _id: product._id, name: product.name, images: product.images },
      size: this.addItemSize || undefined,
      quantity: this.addItemQty,
      price: Math.round(unitPrice * this.addItemQty * 100) / 100,
      _unitPrice: unitPrice
    });

    this.selectedProductToAdd = null;
    this.productSearchQuery = '';
  }

  getEditTotal(): number {
    if (this.isEditing) {
      return this.editData.items.reduce((sum: number, i: any) => sum + (i.price || 0), 0);
    }
    return this.selectedOrder?.totalPrice || 0;
  }

  saveOrderEdit() {
    if (!this.selectedOrder || this.saving) return;
    this.saving = true;

    const payload = {
      address: this.editData.address,
      phone: this.editData.phone,
      governorate: this.editData.governorate,
      notes: this.editData.notes,
      items: this.editData.items.map((i: any) => ({
        product: typeof i.product === 'object' ? i.product._id : i.product,
        size: i.size,
        quantity: i.quantity,
        price: i.price
      })),
      totalPrice: this.getEditTotal()
    };

    this.orderService.updateOrder(this.selectedOrder._id, payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.data) {
          this.selectedOrder = res.data;
        }
        this.isEditing = false;
      },
      error: (err: any) => {
        this.saving = false;
        if (err.error?.errors && err.error?.errors.length > 0) {
           const errMsg = err.error.errors[0].message;
           const msg = typeof errMsg === 'object' ? (this.ts.currentLang() === 'ar' ? (errMsg.ar || errMsg.en) : (errMsg.en || errMsg.ar)) : errMsg;
           alert(msg);
           return;
        }
        console.error('Failed to update order', err);
        alert(this.ts.currentLang() === 'ar' ? 'فشل تعديل الطلب' : 'Failed to update order');
      }
    });
  }
}

