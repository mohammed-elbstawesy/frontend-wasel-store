import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order } from '../models/order.model';
import { CartItem } from '../models/cart.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private apiUrl = environment.apiUrl + 'orders';

  // Real-time orders for admin dashboard
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  orders$ = this.ordersSubject.asObservable();

  // New order notification
  private newOrderSubject = new BehaviorSubject<Order | null>(null);
  newOrder$ = this.newOrderSubject.asObservable();

  constructor(private http: HttpClient) {}

  placeOrder(orderData: {
    items: CartItem[];
    governorate: string;
    address: string;
    phone: string;
    notes?: string;
  }): Observable<any> {
    const order = {
      items: orderData.items.map(item => ({
        product: item.product._id,
        size: item.selectedSize?.label,
        quantity: item.quantity,
        price: (() => {
          const itemPrice = item.selectedSize ? item.selectedSize.price : item.product.price;
          const unitPrice = item.product.discountPercentage 
            ? itemPrice * (1 - (item.product.discountPercentage / 100))
            : itemPrice;
          return unitPrice * item.quantity;
        })(),
      })),
      totalPrice: orderData.items.reduce(
        (sum, i) => {
          const itemPrice = i.selectedSize ? i.selectedSize.price : i.product.price;
          const unitPrice = i.product.discountPercentage 
            ? itemPrice * (1 - (i.product.discountPercentage / 100))
            : itemPrice;
          return sum + unitPrice * i.quantity;
        }, 0
      ),
      governorate: orderData.governorate,
      address: orderData.address,
      phone: orderData.phone,
      notes: orderData.notes || '',
      paymentMethod: 'cash_on_delivery',
    };
    return this.http.post(this.apiUrl, order).pipe(
      tap((res: any) => {
        if (res?.data) {
          const current = this.ordersSubject.value;
          this.ordersSubject.next([res.data, ...current]);
          this.newOrderSubject.next(res.data);
        }
      })
    );
  }

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl).pipe(
      tap(orders => this.ordersSubject.next(orders))
    );
  }

  getOrderById(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`);
  }

  updateOrderStatus(id: string, status: Order['status']): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status }).pipe(
      tap(() => {
        const orders = this.ordersSubject.value.map(o =>
          o._id === id ? { ...o, status } : o
        );
        this.ordersSubject.next(orders);
      })
    );
  }

  updateOrder(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data).pipe(
      tap((res: any) => {
        if (res?.data) {
          const orders = this.ordersSubject.value.map(o =>
            o._id === id ? res.data : o
          );
          this.ordersSubject.next(orders);
        }
      })
    );
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`);
  }

  getUserOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/my-orders`);
  }

  cancelMyOrder(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/my-orders/${id}/cancel`, {});
  }
}
