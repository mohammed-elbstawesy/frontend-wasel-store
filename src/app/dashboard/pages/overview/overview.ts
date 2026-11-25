import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Order } from '../../../core/models/order.model';
import { Product } from '../../../core/models/product.model';
import { SocketService } from '../../../core/services/socket.service';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  template: `
    <!-- Stats Header & Toggles -->
    <div class="overview-header">
      <h1 class="page-title" style="margin-bottom: 0;">{{ 'dash.overview' | translate }}</h1>
      <div class="stats-toggle">
        <button [class.active]="statsView === 'daily'" (click)="statsView = 'daily'">{{ ts.currentLang() === 'ar' ? 'اليوم' : 'Today' }}</button>
        <button [class.active]="statsView === 'monthly'" (click)="statsView = 'monthly'">{{ ts.currentLang() === 'ar' ? 'هذا الشهر' : 'This Month' }}</button>
        <button [class.active]="statsView === 'total'" (click)="statsView = 'total'">{{ ts.currentLang() === 'ar' ? 'كل الوقت' : 'All Time' }}</button>
      </div>
    </div>

    <!-- Orders Pause Toggle -->
    <div class="pause-banner" [class.paused]="ordersPaused">
      <div class="pause-info">
        <span class="pause-icon">{{ ordersPaused ? '⛔' : '✅' }}</span>
        <div>
          <span class="pause-title">{{ ordersPaused 
            ? (ts.currentLang() === 'ar' ? 'الطلبات متوقفة' : 'Orders Paused') 
            : (ts.currentLang() === 'ar' ? 'الطلبات تعمل بشكل طبيعي' : 'Orders Active') }}</span>
          <span class="pause-desc">{{ ordersPaused
            ? (ts.currentLang() === 'ar' ? 'لن يتمكن العملاء من تقديم طلبات جديدة' : 'Customers cannot place new orders')
            : (ts.currentLang() === 'ar' ? 'العملاء يمكنهم الطلب بشكل طبيعي' : 'Customers can place orders normally') }}</span>
        </div>
      </div>
      <button class="pause-btn" [class.btn-danger]="!ordersPaused" [class.btn-success]="ordersPaused" (click)="toggleOrdersPause()" [disabled]="isTogglingPause">
        {{ isTogglingPause ? '...' : (ordersPaused 
          ? (ts.currentLang() === 'ar' ? 'تشغيل الطلبات' : 'Resume Orders') 
          : (ts.currentLang() === 'ar' ? 'إيقاف الطلبات' : 'Pause Orders')) }}
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon orders">📦</div>
        <div class="stat-info">
          <span class="stat-value">{{ activeOrdersCount }}</span>
          <span class="stat-label">{{ 'dash.total_orders' | translate }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon revenue">💰</div>
        <div class="stat-info">
          <span class="stat-value">{{ activeRevenue.toLocaleString() }}</span>
          <span class="stat-label">{{ 'dash.total_revenue' | translate }} ({{ 'product.egp' | translate }})</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon products">🛒</div>
        <div class="stat-info">
          <span class="stat-value">{{ products.length }}</span>
          <span class="stat-label">{{ 'dash.total_products' | translate }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon lowstock">⚠️</div>
        <div class="stat-info">
          <span class="stat-value">{{ lowStockProducts.length }}</span>
          <span class="stat-label">{{ 'dash.low_stock' | translate }}</span>
        </div>
      </div>
    </div>

    <!-- Recent Orders -->
    <div class="section-card">
      <div class="section-header">
        <h2>{{ 'dash.recent_orders' | translate }}</h2>
        <a routerLink="/dashboard/orders" class="btn btn-ghost btn-sm">{{ 'home.view_all' | translate }}</a>
      </div>
      @if (orders.length > 0) {
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{{ 'dash.customer' | translate }}</th>
                <th>{{ 'cart.total' | translate }}</th>
                <th>{{ 'dash.status' | translate }}</th>
                <th>{{ ts.currentLang() === 'ar' ? 'التاريخ' : 'Date' }}</th>
              </tr>
            </thead>
            <tbody>
              @for (order of orders.slice(0, 5); track order._id) {
                <tr>
                  <td>{{ order._id.slice(-6) }}</td>
                  <td>{{ getCustomerName(order) }}</td>
                  <td>{{ order.totalPrice.toLocaleString() }} {{ 'product.egp' | translate }}</td>
                  <td><span class="badge" [ngClass]="getStatusClass(order.status)">{{ ts.t('dash.' + order.status) }}</span></td>
                  <td>{{ order.createdAt | date:'short' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="empty-text">{{ ts.currentLang() === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet' }}</p>
      }
    </div>
  `,
  styles: [`
    .page-title { font-size: 26px; font-weight: 700; margin-bottom: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card {
      background: var(--bg-card); border-radius: var(--radius); border: 1px solid var(--border);
      padding: 20px; display: flex; align-items: center; gap: 16px;
    }
    .stat-icon { font-size: 32px; width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .stat-icon.orders { background: rgba(59, 130, 246, 0.1); }
    .stat-icon.products { background: rgba(16, 185, 129, 0.1); }
    .stat-icon.revenue { background: rgba(245, 166, 35, 0.1); }
    .stat-icon.lowstock { background: rgba(239, 68, 68, 0.1); }
    .stat-value { font-size: 24px; font-weight: 700; display: block; color: var(--text); }
    .stat-label { font-size: 13px; color: var(--text-secondary); }
    .section-card { background: var(--bg-card); border-radius: var(--radius); border: 1px solid var(--border); padding: 20px; color: var(--text); }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .section-header h2 { font-size: 18px; font-weight: 600; color: var(--text); }
    .empty-text { text-align: center; padding: 32px; color: var(--text-muted); }
    .stats-toggle { display: flex; background: var(--bg-input); border-radius: var(--radius-sm); border: 1px solid var(--border); overflow: hidden; }
    .stats-toggle button { background: none; border: none; padding: 8px 16px; cursor: pointer; color: var(--text-secondary); font-weight: 600; font-size: 14px; transition: background 0.2s; }
    .stats-toggle button:hover { background: rgba(0,0,0,0.05); }
    .stats-toggle button.active { background: var(--primary); color: white; }
    .overview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }

    /* Pause Banner */
    .pause-banner {
      display: flex; align-items: center; justify-content: space-between;
      background: var(--bg-card); border: 2px solid var(--success, #22c55e);
      border-radius: var(--radius); padding: 16px 20px; margin-bottom: 24px;
      transition: all 0.3s ease;
    }
    .pause-banner.paused {
      border-color: var(--danger, #ef4444);
      background: rgba(239, 68, 68, 0.05);
    }
    .pause-info { display: flex; align-items: center; gap: 14px; }
    .pause-icon { font-size: 28px; }
    .pause-title { font-size: 16px; font-weight: 700; color: var(--text); display: block; }
    .pause-desc { font-size: 13px; color: var(--text-muted); display: block; margin-top: 2px; }
    .pause-btn {
      padding: 10px 20px; border-radius: var(--radius-sm); border: none;
      font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s;
      white-space: nowrap;
    }
    .pause-btn.btn-danger { background: var(--danger, #ef4444); color: white; }
    .pause-btn.btn-danger:hover { opacity: 0.85; }
    .pause-btn.btn-success { background: var(--success, #22c55e); color: white; }
    .pause-btn.btn-success:hover { opacity: 0.85; }
    .pause-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
      .overview-header { flex-direction: column; align-items: flex-start; }
      .stats-toggle { width: 100%; }
      .stats-toggle button { flex: 1; padding: 6px 8px; font-size: 12px; justify-content: center; }
      .stat-card { padding: 12px; gap: 10px; }
      .stat-icon { width: 40px; height: 40px; font-size: 22px; border-radius: 8px; }
      .stat-value { font-size: 18px; }
      .stat-label { font-size: 11px; }
      .section-card { padding: 12px; }
      .section-header h2 { font-size: 15px; }
      .pause-banner { flex-direction: column; gap: 12px; align-items: stretch; text-align: center; }
      .pause-info { flex-direction: column; gap: 8px; }
      .pause-btn { width: 100%; }
    }
    @media (max-width: 480px) { .stats-grid { grid-template-columns: 1fr; } }
  `]
})
export class Overview implements OnInit, OnDestroy {
  ts = inject(TranslationService);
  orderService = inject(OrderService);
  productService = inject(ProductService);
  settingsService = inject(SettingsService);
  confirmService = inject(ConfirmService);
  toastService = inject(ToastService);
  socketService = inject(SocketService);

  orders: Order[] = [];
  products: Product[] = [];
  statsView: 'daily' | 'monthly' | 'total' = 'monthly';
  statsData: any = {
    daily: { count: 0, revenue: 0 },
    monthly: { count: 0, revenue: 0 },
    total: { count: 0, revenue: 0 }
  };
  lowStockProducts: Product[] = [];
  ordersPaused = false;
  isTogglingPause = false;
  private subs: Subscription[] = [];

  ngOnInit() {
    this.loadStats();
    this.loadProducts();
    this.loadSettings();

    // Load orders initially
    this.orderService.getOrders().subscribe();

    this.subs.push(
      this.orderService.orders$.subscribe(orders => {
        this.orders = orders;
      })
    );

    // Socket: new order → refresh stats + orders
    this.subs.push(
      this.socketService.listen('new_order').subscribe(() => {
        this.loadStats();
        this.orderService.getOrders().subscribe();
      })
    );

    // Socket: order updated → refresh stats + orders
    this.subs.push(
      this.socketService.listen('order_updated').subscribe(() => {
        this.loadStats();
        this.orderService.getOrders().subscribe();
      })
    );

    // Socket: stock updated → refresh products
    this.subs.push(
      this.socketService.listen('stock_updated').subscribe(() => {
        this.loadProducts();
      })
    );

    // Socket: product created/updated/deleted → refresh products
    this.subs.push(
      this.socketService.listen('product_created').subscribe(() => this.loadProducts())
    );
    this.subs.push(
      this.socketService.listen('product_updated').subscribe(() => this.loadProducts())
    );
    this.subs.push(
      this.socketService.listen('product_deleted').subscribe(() => this.loadProducts())
    );

    // Socket: settings updated → refresh settings
    this.subs.push(
      this.socketService.listen('settings_updated').subscribe(() => this.loadSettings())
    );

    // Fallback polling when deployed on serverless (Vercel) where WebSockets are inactive
    this.subs.push(
      this.socketService.pollInServerless(30000).subscribe(() => {
        this.loadStats();
        this.loadProducts();
        this.loadSettings();
        this.orderService.getOrders().subscribe();
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadStats() {
    this.orderService.getStats().subscribe(stats => {
      if (stats) this.statsData = stats;
    });
  }

  loadProducts() {
    this.productService.getAdminProducts().subscribe(products => {
      this.products = products;
      this.lowStockProducts = products.filter(p => p.stock < 10);
    });
  }

  loadSettings() {
    this.settingsService.getSettings().subscribe(settings => {
      this.ordersPaused = settings.ordersPaused;
    });
  }

  async toggleOrdersPause() {
    const newState = !this.ordersPaused;
    const msg = newState
      ? (this.ts.currentLang() === 'ar' ? 'هل أنت متأكد من إيقاف الطلبات؟ لن يتمكن العملاء من تقديم طلبات جديدة.' : 'Are you sure you want to pause orders? Customers won\'t be able to place new orders.')
      : (this.ts.currentLang() === 'ar' ? 'هل تريد تشغيل الطلبات مجدداً؟' : 'Resume orders for all customers?');

    const confirmed = await this.confirmService.ask(msg, newState ? 'danger' : 'warning');
    if (!confirmed) return;

    this.isTogglingPause = true;
    this.settingsService.updateSettings({ ordersPaused: newState }).subscribe({
      next: () => {
        this.ordersPaused = newState;
        this.isTogglingPause = false;
        this.toastService.show(
          newState
            ? (this.ts.currentLang() === 'ar' ? 'تم إيقاف الطلبات' : 'Orders paused')
            : (this.ts.currentLang() === 'ar' ? 'تم تشغيل الطلبات' : 'Orders resumed'),
          newState ? 'info' : 'success'
        );
      },
      error: () => {
        this.isTogglingPause = false;
        this.toastService.show('Error updating settings', 'error');
      }
    });
  }

  get activeOrdersCount() {
     return this.statsData[this.statsView]?.count || 0;
  }

  get activeRevenue() {
     return this.statsData[this.statsView]?.revenue || 0;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'badge-warning', confirmed: 'badge-info',
      shipped: 'badge-info', delivered: 'badge-success', cancelled: 'badge-danger'
    };
    return map[status] || 'badge-neutral';
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
}