import { Product } from './product.model';

export interface OrderItem {
  product: Product | string;
  size?: string;
  quantity: number;
  price: number;
}

export interface StatusHistoryItem {
  status: string;
  timestamp: string;
  note?: string;
}

export interface Order {
  _id: string;
  user: any;
  items: OrderItem[];
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  statusHistory?: StatusHistoryItem[];
  paymentMethod: 'cash_on_delivery';
  governorate: string;
  address: string;
  phone: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}
