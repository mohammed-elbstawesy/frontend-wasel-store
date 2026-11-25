import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ImgUrlPipe } from '../../shared/pipes/img-url.pipe';
import { FallbackImageDirective } from '../../shared/directives/fallback-image.directive';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';
import { Order } from '../../core/models/order.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, ImgUrlPipe, FallbackImageDirective],
  template: `
    <div class="container page">
      <div class="page-header">
        <h1 class="page-title">{{ ts.currentLang() === 'ar' ? 'طلباتي' : 'My Orders' }}</h1>
      </div>

      @if (!authService.isLogin()) {
        <div class="empty-state animate-fadeIn" style="text-align:center;padding:48px 24px;">
          <div style="margin-bottom:16px;color:var(--primary);">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h3>{{ ts.currentLang() === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first' }}</h3>
          <p style="color:var(--text-muted);margin:8px 0 24px;">
            {{ ts.currentLang() === 'ar' ? 'قم بتسجيل الدخول للاطلاع على طلباتك السابقة.' : 'Log in to view your previous orders.' }}
          </p>
          <a [routerLink]="['/login']" [queryParams]="{ returnUrl: '/my-orders' }" class="btn btn-primary btn-lg">
            {{ ts.currentLang() === 'ar' ? 'تسجيل الدخول' : 'Log In' }}
          </a>
        </div>
      } @else if (loading) {
        <div class="empty-state">
          <div class="loading-spinner"></div>
          <p>{{ ts.currentLang() === 'ar' ? 'جاري التحميل...' : 'Loading...' }}</p>
        </div>
      } @else if (orders.length > 0) {
        <div class="orders-list">
          @for (order of orders; track order._id) {
            <div class="order-card animate-fadeIn">
              <div class="order-header">
                <div>
                  <span class="order-id">#{{ order._id.slice(-6) }}</span>
                  <span class="order-date">{{ order.createdAt | date:'mediumDate' }}</span>
                </div>
                <span class="badge" [ngClass]="getStatusClass(order.status)">
                  {{ getStatusLabel(order.status) }}
                </span>
              </div>

              <!-- Order Tracking Timeline -->
              @if (order.status !== 'cancelled') {
                <div class="tracking-section">
                  <div class="tracking-timeline">
                    @for (step of trackingSteps; track step.key) {
                      <div class="tracking-step"
                        [class.completed]="isStepCompleted(order, step.key)"
                        [class.current]="order.status === step.key">
                        <div class="step-icon">
                          @if (isStepCompleted(order, step.key)) {
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                          } @else if (order.status === step.key) {
                            <div class="step-pulse"></div>
                          } @else {
                            <div class="step-dot"></div>
                          }
                        </div>
                        <div class="step-label">{{ ts.currentLang() === 'ar' ? step.labelAr : step.labelEn }}</div>
                        @if (getStepTime(order, step.key)) {
                          <div class="step-time">{{ getStepTime(order, step.key) | date:'shortTime' }}</div>
                        }
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <div class="cancelled-banner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                  {{ ts.currentLang() === 'ar' ? 'تم إلغاء هذا الطلب' : 'This order has been cancelled' }}
               </div>
              }
              
              <div class="order-footer">
                <div class="footer-left">
                  <div class="order-address">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {{ order.governorate }} - {{ order.address | slice:0:30 }}
                  </div>
                  <!-- Cancel button for user -->
                  @if (canCancel(order)) {
                    <button class="cancel-order-btn" (click)="confirmCancel(order)" [disabled]="cancellingId === order._id">
                      @if (cancellingId === order._id) {
                        <span class="btn-spinner"></span>
                      } @else {
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                      }
                      {{ ts.currentLang() === 'ar' ? 'إلغاء الطلب' : 'Cancel Order' }}
                    </button>
                  }
                </div>
                <div class="footer-right">
                  <button class="btn-view-details" (click)="openDetails(order)">
                    {{ ts.currentLang() === 'ar' ? 'تفاصيل الطلب' : 'View Details' }}
                  </button>
                  <div class="order-total">
                    <span>{{ 'cart.total' | translate }}</span>
                    <strong>{{ formatPrice(order.totalPrice) }} {{ 'product.egp' | translate }}</strong>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="empty-state animate-fadeIn">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
          <h2>{{ ts.currentLang() === 'ar' ? 'لا توجد طلبات سابقة' : 'No previous orders' }}</h2>
          <p>{{ ts.currentLang() === 'ar' ? 'لم تقم بإجراء أي طلب من متجرنا حتى الآن.' : 'You have not placed any orders yet.' }}</p>
        </div>
      }

      <!-- Order Details Modal -->
      @if (selectedOrder) {
        <div class="confirm-overlay" (click)="closeDetails()">
          <div class="details-modal animate-fadeIn" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ ts.currentLang() === 'ar' ? 'تفاصيل الطلب' : 'Order Details' }} #{{ selectedOrder._id.slice(-6) }}</h3>
              <button class="close-modal-btn" (click)="closeDetails()">✕</button>
            </div>
            
            <div class="modal-body">
              <div class="order-items">
                @for (item of selectedOrder.items; track $index) {
                  <div class="order-item">
                    <div class="item-left">
                      @if (getProductImage(item.product)) {
                        <a [routerLink]="['/product', getProductId(item.product)]" class="item-image-link" (click)="closeDetails()">
                          <img [src]="getProductImage(item.product) | imgUrl" [alt]="getProductName(item.product)" appFallbackImage class="item-image">
                        </a>
                      }
                      <div class="item-info">
                        <a [routerLink]="['/product', getProductId(item.product)]" class="item-name-link" (click)="closeDetails()">
                          {{ getProductName(item.product) }}
                        </a>
                        <span class="item-meta">
                          @if (item.size) { {{ item.size }} · }
                          {{ ts.currentLang() === 'ar' ? 'الكمية' : 'Qty' }}: {{ item.quantity }}
                        </span>
                      </div>
                    </div>
                    <span class="item-price">{{ formatPrice(item.price) }} {{ 'product.egp' | translate }}</span>
                  </div>
                }
              </div>

              <div class="modal-totals">
                <div class="modal-total-line mb-1">
                  <span>{{ ts.currentLang() === 'ar' ? 'طريقة الدفع' : 'Payment Method' }}</span>
                  <span>{{ ts.currentLang() === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery' }}</span>
                </div>
                <div class="modal-total-line final-total">
                  <span>{{ 'cart.total' | translate }}</span>
                  <strong>{{ formatPrice(selectedOrder.totalPrice) }} {{ 'product.egp' | translate }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Cancel Confirmation Overlay -->
      @if (showCancelConfirm) {
        <div class="confirm-overlay" (click)="showCancelConfirm = false">
          <div class="confirm-dialog animate-fadeIn" (click)="$event.stopPropagation()">
            <div class="confirm-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
            </div>
            <h3>{{ ts.currentLang() === 'ar' ? 'تأكيد إلغاء الطلب' : 'Confirm Cancellation' }}</h3>
            <p>{{ ts.currentLang() === 'ar' ? 'هل أنت متأكد أنك تريد إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to cancel this order? This action cannot be undone.' }}</p>
            <div class="confirm-actions">
              <button class="btn-confirm-cancel" (click)="cancelOrder()">
                {{ ts.currentLang() === 'ar' ? 'نعم، إلغاء الطلب' : 'Yes, Cancel Order' }}
              </button>
              <button class="btn-confirm-keep" (click)="showCancelConfirm = false">
                {{ ts.currentLang() === 'ar' ? 'لا، الاحتفاظ بالطلب' : 'No, Keep Order' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './my-orders.css'
})
export class MyOrders implements OnInit, OnDestroy {
  ts = inject(TranslationService);
  orderService = inject(OrderService);
  toastService = inject(ToastService);
  socketService = inject(SocketService);
  authService = inject(AuthService);

  orders: Order[] = [];
  loading = true;
  private subs: Subscription[] = [];

  // Cancel state
  showCancelConfirm = false;
  cancellingId: string | null = null;
  orderToCancel: Order | null = null;
  
  // Details Modal
  selectedOrder: Order | null = null;

  trackingSteps = [
    { key: 'pending',   labelAr: 'قيد المراجعة', labelEn: 'Pending' },
    { key: 'confirmed', labelAr: 'تم التأكيد',   labelEn: 'Confirmed' },
    { key: 'shipped',   labelAr: 'خرج للتوصيل',  labelEn: 'Shipped' },
    { key: 'delivered', labelAr: 'تم التوصيل',    labelEn: 'Delivered' },
  ];

  private statusOrder: Record<string, number> = {
    'pending': 0, 'confirmed': 1, 'shipped': 2, 'delivered': 3, 'cancelled': -1
  };

  openDetails(order: Order) {
    this.selectedOrder = order;
  }

  closeDetails() {
    this.selectedOrder = null;
  }

  ngOnInit() {
    if (!this.authService.isLogin()) {
      this.loading = false;
      return;
    }
    this.loadOrders();
    
    // Listen for real-time order updates via Socket.IO
    this.subs.push(
      this.socketService.listen('order_updated').subscribe((updatedOrder: Order) => {
        if (updatedOrder) {
          const index = this.orders.findIndex(o => o._id === updatedOrder._id);
          if (index !== -1) {
            // Update existng order
            this.orders[index] = updatedOrder;
          } else {
            // Usually shouldn't happen for updates, but just in case or for testing
            this.loadOrders();
          }
        }
      })
    );

    // Fallback polling when deployed on serverless (Vercel) where WebSockets are inactive
    this.subs.push(
      this.socketService.pollInServerless(25000).subscribe(() => {
        if (this.authService.isLogin()) {
          this.loadOrders();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadOrders() {
    this.orderService.getUserOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  isStepCompleted(order: Order, stepKey: string): boolean {
    if (order.status === 'cancelled') return false;
    return this.statusOrder[order.status] >= this.statusOrder[stepKey];
  }

  getStepTime(order: Order, stepKey: string): string | null {
    if (!order.statusHistory) return null;
    const entry = order.statusHistory.find(h => h.status === stepKey);
    return entry ? entry.timestamp : null;
  }

  getStatusClass(status: string): string {
    const m: Record<string, string> = { pending: 'badge-warning', confirmed: 'badge-info', shipped: 'badge-info', delivered: 'badge-success', cancelled: 'badge-danger' };
    return m[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, { ar: string; en: string }> = {
      pending:   { ar: 'قيد المراجعة', en: 'Pending' },
      confirmed: { ar: 'تم التأكيد',   en: 'Confirmed' },
      shipped:   { ar: 'خرج للتوصيل',  en: 'Shipped' },
      delivered: { ar: 'تم التوصيل',    en: 'Delivered' },
      cancelled: { ar: 'ملغي',          en: 'Cancelled' },
    };
    return this.ts.currentLang() === 'ar' ? labels[status]?.ar : labels[status]?.en;
  }

  getProductName(product: any): string {
    if (typeof product === 'string') return product;
    if (product?.name) {
      return this.ts.currentLang() === 'ar' ? (product.name.ar || product.name.en) : (product.name.en || product.name.ar);
    }
    return 'N/A';
  }

  getProductId(product: any): string {
    if (typeof product === 'string') return product;
    return product?._id || '';
  }

  getProductImage(product: any): string {
    if (typeof product === 'string') return '';
    if (product?.images && product.images.length > 0) {
      return product.images[0];
    }
    return '';
  }

  canCancel(order: Order): boolean {
    return order.status === 'pending' || order.status === 'confirmed';
  }

  confirmCancel(order: Order) {
    this.orderToCancel = order;
    this.showCancelConfirm = true;
  }

  cancelOrder() {
    if (!this.orderToCancel) return;
    const orderId = this.orderToCancel._id;
    this.showCancelConfirm = false;
    this.cancellingId = orderId;

    this.orderService.cancelMyOrder(orderId).subscribe({
      next: () => {
        this.cancellingId = null;
        this.toastService.show(
          this.ts.currentLang() === 'ar' ? 'تم إلغاء الطلب بنجاح' : 'Order cancelled successfully',
          'success'
        );
        this.loadOrders();
      },
      error: (err) => {
        this.cancellingId = null;
        const msg = err.error?.message;
        const errorText = typeof msg === 'object'
          ? (this.ts.currentLang() === 'ar' ? (msg.ar || msg.en) : (msg.en || msg.ar))
          : (msg || (this.ts.currentLang() === 'ar' ? 'فشل إلغاء الطلب' : 'Failed to cancel order'));
        this.toastService.show(errorText, 'error');
      }
    });
  }

  formatPrice(price: number): string {
    return price.toLocaleString();
  }
}
