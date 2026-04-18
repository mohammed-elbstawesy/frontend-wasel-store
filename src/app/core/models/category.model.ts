export interface SubCategory {
  _id: string;
  name: { en: string; ar: string };
}

export interface Category {
  _id: string;
  name: { en: string; ar: string };
  image: string;
  subCategories: SubCategory[];
  isDeleted?: boolean;
}
