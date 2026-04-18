import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../core/models/order.model';
import { SocketService } from '../../../core/services/socket.service';

@Component({
  selector: 'app-delivered-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ ts.currentLang() === 'ar' ? 'الطلبات المسلمة' : 'Delivered Orders' }}</h1>
      <input type="text" class="form-input" style="max-width: 300px; flex: 1;"
             [placeholder]="ts.currentLang() === 'ar' ? 'بحث بالاسم، أو رقم الهاتف...' : 'Search by name, or phone...'"
             [(ngModel)]="searchQuery" (ngModelChange)="applyFilter()">
    </div>

    <!-- Delivered Orders Internal Navbar -->
    <div class="orders-nav">
      <button [class.active]="currentTab === 'all'" (click)="setTab('all')">
        📦 {{ ts.currentLang() === 'ar' ? 'الكل' : 'All' }}
        <span class="badge badge-neutral">{{ getCount('all') }}</span>
      </button>
      <button [class.active]="currentTab === 'website'" (click)="setTab('website')">
        🌐 {{ ts.currentLang() === 'ar' ? 'طلبات الموقع' : 'By Website' }}
        <span class="badge badge-info">{{ getCount('website') }}</span>
      </button>
      <button [class.active]="currentTab === 'manual'" (click)="setTab('manual')">
        ✍️ {{ ts.currentLang() === 'ar' ? 'الطلبات اليدوية' : 'Manual Orders' }}
        <span class="badge badge-warning">{{ getCount('manual') }}</span>
      </button>
    </div>

    @if (filteredOrders.length > 0) {
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{{ 'dash.customer' | translate }}</th>
              <th>{{ 'checkout.phone' | translate }}</th>
              <th>{{ 'checkout.governorate' | translate }}</th>
              <th>{{ ts.currentLang() === 'ar' ? 'النوع' : 'Source' }}</th>
              <th>{{ 'cart.total' | translate }}</th>
              <th>{{ 'dash.actions' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (order of filteredOrders; track order._id) {
              <tr class="animate-fadeIn">
                <td class="order-id">{{ order._id.slice(-6) }}</td>
                <td>{{ getCustomerName(order) }}</td>
                <td dir="ltr">{{ order.phone }}</td>
                <td>{{ order.governorate || '-' }}</td>
                <td>
                  @if (!order.user || $any(order).customerName) {
                    <span class="badge badge-warning">{{ ts.currentLang() === 'ar' ? 'يدوي' : 'Manual' }}</span>
                  } @else {
                    <span class="badge badge-info">{{ ts.currentLang() === 'ar' ? 'موقع' : 'Website' }}</span>
                  }
                </td>
                <td class="price-col">{{ order.totalPrice.toLocaleString() }} {{ 'product.egp' | translate }}</td>
                <td>
                  <button class="btn btn-ghost btn-sm" (click)="selectedOrder = order">
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
        <p>{{ ts.currentLang() === 'ar' ? 'لا توجد طلبات مسلمة تطابق بحثك' : 'No delivered orders found' }}</p>
      </div>
    }

    <!-- Order Details Modal -->
    @if (selectedOrder) {
      <div class="modal-overlay" (click)="selectedOrder = null">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ 'dash.order_details' | translate }} #{{ selectedOrder._id.slice(-6) }}</h2>
            <button class="modal-close" (click)="selectedOrder = null">✕</button>
          </div>
          <div class="modal-body">
            <div class="detail-row"><strong>{{ 'dash.customer' | translate }}:</strong> {{ getCustomerName(selectedOrder) }}</div>
            <div class="detail-row"><strong>{{ 'checkout.phone' | translate }}:</strong> {{ selectedOrder.phone }}</div>
            <div class="detail-row"><strong>{{ 'checkout.governorate' | translate }}:</strong> {{ selectedOrder.governorate || '-' }}</div>
            <div class="detail-row"><strong>{{ 'checkout.address' | translate }}:</strong> {{ selectedOrder.address || '-' }}</div>
            @if (selectedOrder.notes) {
              <div class="detail-row"><strong>{{ 'checkout.notes' | translate }}:</strong> {{ selectedOrder.notes }}</div>
            }
            <h3 class="mt-2">{{ ts.currentLang() === 'ar' ? 'المنتجات' : 'Items' }}</h3>
            <div class="items-list">
              @for (item of selectedOrder.items; track item.product) {
                <div class="item-row">
                  <div class="item-info">
                    <span class="item-name">{{ getProductName(item.product) }}</span>
                    <span class="item-meta">
                      @if (item.size) { {{ item.size }} } × {{ item.quantity }}
                    </span>
                  </div>
                  <span class="item-price">{{ item.price.toLocaleString() }} {{ 'product.egp' | translate }}</span>
                </div>
              }
            </div>
            <div class="modal-total">
              <strong>{{ 'cart.total' | translate }}:</strong>
              <strong class="text-primary">{{ selectedOrder.totalPrice.toLocaleString() }} {{ 'product.egp' | translate }}</strong>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .page-title { font-size: 26px; font-weight: 700; margin-bottom: 0; }
    .order-id { font-family: monospace; font-weight: 600; }
    .price-col { font-weight: 600; color: var(--primary); }
    .empty-state { text-align: center; padding: 60px; color: var(--text-muted); }
    .orders-nav { display: flex; gap: 8px; background: var(--bg-card); padding: 12px; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 20px; overflow-x: auto; scrollbar-width: none; }
    .orders-nav::-webkit-scrollbar { display: none; }
    .orders-nav button { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: none; background: transparent; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600; color: var(--text-secondary); white-space: nowrap; transition: all 0.2s; }
    .orders-nav button:hover { background: rgba(0,0,0,0.03); }
    .orders-nav button.active { background: var(--surface); color: var(--primary); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .orders-nav button .badge { padding: 2px 6px; font-size: 11px; }
    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-content { background: var(--bg-card); border-radius: var(--radius); max-width: 500px; width: 100%; max-height: 80vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
    .modal-header h2 { font-size: 18px; font-weight: 600; }
    .modal-close { font-size: 20px; color: var(--text-muted); }
    .modal-body { padding: 20px; }
    .detail-row { padding: 6px 0; font-size: 14px; }
    .items-list { margin: 12px 0; }
    .item-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; gap: 12px; }
    .item-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .item-name { font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item-meta { font-size: 12px; color: var(--text-muted); }
    .item-price { font-weight: 600; color: var(--primary); white-space: nowrap; }
    .modal-total { display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid var(--border); font-size: 16px; margin-top: 12px; }
    @media (max-width: 768px) {
      .page-title { font-size: 20px; }
      .orders-nav { gap: 4px; padding: 8px; }
      .orders-nav button { padding: 8px 12px; font-size: 13px; gap: 4px; }
      table { font-size: 13px; }
      table th, table td { padding: 8px 6px; }
      .modal-content { max-width: 100%; margin: 8px; }
      .modal-header h2 { font-size: 16px; }
    }
  `]
})
export class DeliveredOrders implements OnInit, OnDestroy {
  ts = inject(TranslationService);
  orderService = inject(OrderService);
  socketService = inject(SocketService);

  orders: Order[] = [];
  filteredOrders: Order[] = [];
  searchQuery = '';
  currentTab: 'all' | 'website' | 'manual' = 'all';
  selectedOrder: Order | null = null;
  private subs: Subscription[] = [];

  ngOnInit() {
    this.orderService.getOrders().subscribe();

    this.subs.push(
      this.orderService.orders$.subscribe(orders => {
        // Only get delivered orders
        this.orders = orders.filter(o => o.status === 'delivered');
        this.applyFilter();
      })
    );

    this.subs.push(
      this.socketService.listen('order_updated').subscribe((updatedOrder: Order) => {
        if (updatedOrder && updatedOrder.status === 'delivered') {
          const exists = this.orders.find(o => o._id === updatedOrder._id);
          if (!exists) {
            this.orders = [updatedOrder, ...this.orders];
          } else {
            this.orders = this.orders.map(o => o._id === updatedOrder._id ? updatedOrder : o);
          }
          this.applyFilter();
        } else if (updatedOrder && updatedOrder.status !== 'delivered') {
          // In case a delivered order was changed back (rare but possible)
          this.orders = this.orders.filter(o => o._id !== updatedOrder._id);
          this.applyFilter();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  setTab(tab: 'all' | 'website' | 'manual') {
    this.currentTab = tab;
    this.applyFilter();
  }

  getCount(tab: string): number {
    if (tab === 'all') return this.orders.length;
    if (tab === 'manual') return this.orders.filter(o => !o.user || (o as any).isManual).length;
    if (tab === 'website') return this.orders.filter(o => o.user && !(o as any).isManual).length;
    return 0;
  }

  applyFilter() {
    let result = this.orders;

    if (this.currentTab === 'manual') {
      result = result.filter(o => !o.user || (o as any).isManual);
    } else if (this.currentTab === 'website') {
      result = result.filter(o => o.user && !(o as any).isManual);
    }

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
}
