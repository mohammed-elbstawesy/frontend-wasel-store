import { Product, ProductSize } from './product.model';

export interface CartItem {
  product: Product;
  selectedSize?: ProductSize;
  quantity: number;
}
