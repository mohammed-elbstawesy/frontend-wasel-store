export interface ProductSize {
  label: string;
  price: number;
  stock?: number;
}

export interface Product {
  _id: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  price: number;
  sizes?: ProductSize[];
  category: string;
  subCategory: string;
  stock: number;
  images: string[];
  isTopSelling?: boolean;
  discountPercentage?: number;
  discountExpiry?: Date | string;
  isDeleted?: boolean;
  createdAt: string;
}
