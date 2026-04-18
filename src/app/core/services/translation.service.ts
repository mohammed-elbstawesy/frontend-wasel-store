import { Injectable, signal, effect } from '@angular/core';

export type Lang = 'en' | 'ar';

const TRANSLATIONS: Record<string, Record<Lang, string>> = {
  // Navbar
  'nav.home': { en: 'Home', ar: 'الرئيسية' },
  'nav.categories': { en: 'Categories', ar: 'الأقسام' },
  'nav.cart': { en: 'Cart', ar: 'السلة' },
  'nav.login': { en: 'Login', ar: 'تسجيل الدخول' },
  'nav.signup': { en: 'Sign Up', ar: 'إنشاء حساب' },
  'nav.profile': { en: 'Profile', ar: 'الملف الشخصي' },
  'nav.logout': { en: 'Logout', ar: 'تسجيل الخروج' },
  'nav.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },

  // Home
  'home.hero.title': { en: 'Your Trusted Lab Supplies Partner', ar: 'شريكك الموثوق لمستلزمات المعامل' },
  'home.hero.subtitle': { en: 'Premium medical and laboratory testing kits delivered to your door across Egypt', ar: 'أدوات تحاليل طبية ومعملية متميزة توصل لباب بيتك في كل مصر' },
  'home.hero.cta': { en: 'Shop Now', ar: 'تسوق الآن' },
  'home.featured_categories': { en: 'Featured Categories', ar: 'الأقسام المميزة' },
  'home.popular_products': { en: 'Popular Products', ar: 'المنتجات الشائعة' },
  'home.view_all': { en: 'View All', ar: 'عرض الكل' },

  // Products
  'product.add_to_cart': { en: 'Add to Cart', ar: 'أضف للسلة' },
  'product.size': { en: 'Size', ar: 'المقاس' },
  'product.tests': { en: 'Tests', ar: 'تحليل' },
  'product.quantity': { en: 'Quantity', ar: 'الكمية' },
  'product.description': { en: 'Description', ar: 'الوصف' },
  'product.pdf_document': { en: 'Product Document', ar: 'مستند المنتج' },
  'product.related': { en: 'Related Products', ar: 'منتجات ذات صلة' },
  'product.in_stock': { en: 'In Stock', ar: 'متوفر' },
  'product.out_of_stock': { en: 'Out of Stock', ar: 'غير متوفر' },
  'product.egp': { en: 'EGP', ar: 'ج.م' },
  'product.sort_by': { en: 'Sort by', ar: 'ترتيب حسب' },
  'product.price_low': { en: 'Price: Low to High', ar: 'السعر: من الأقل' },
  'product.price_high': { en: 'Price: High to Low', ar: 'السعر: من الأعلى' },
  'product.newest': { en: 'Newest', ar: 'الأحدث' },
  'product.no_products': { en: 'No products found', ar: 'لا توجد منتجات' },

  // Cart
  'cart.title': { en: 'Shopping Cart', ar: 'سلة التسوق' },
  'cart.empty': { en: 'Your cart is empty', ar: 'السلة فارغة' },
  'cart.total': { en: 'Total', ar: 'الإجمالي' },
  'cart.checkout': { en: 'Checkout', ar: 'إتمام الطلب' },
  'cart.continue_shopping': { en: 'Continue Shopping', ar: 'متابعة التسوق' },
  'cart.remove': { en: 'Remove', ar: 'إزالة' },
  'cart.clear': { en: 'Clear Cart', ar: 'تفريغ السلة' },

  // Checkout
  'checkout.title': { en: 'Checkout', ar: 'إتمام الطلب' },
  'checkout.order_summary': { en: 'Order Summary', ar: 'ملخص الطلب' },
  'checkout.governorate': { en: 'Governorate', ar: 'المحافظة' },
  'checkout.address': { en: 'Delivery Address', ar: 'عنوان التسليم' },
  'checkout.phone': { en: 'Phone Number', ar: 'رقم الهاتف' },
  'checkout.notes': { en: 'Order Notes (optional)', ar: 'ملاحظات (اختياري)' },
  'checkout.cash_on_delivery': { en: 'Cash on Delivery', ar: 'الدفع عند الاستلام' },
  'checkout.place_order': { en: 'Place Order', ar: 'تأكيد الطلب' },
  'checkout.success': { en: 'Order placed successfully!', ar: 'تم تأكيد الطلب بنجاح!' },
  'checkout.select_governorate': { en: 'Select Governorate', ar: 'اختر المحافظة' },

  // Auth
  'auth.email': { en: 'Email', ar: 'البريد الإلكتروني' },
  'auth.password': { en: 'Password', ar: 'كلمة المرور' },
  'auth.confirm_password': { en: 'Confirm Password', ar: 'تأكيد كلمة المرور' },
  'auth.first_name': { en: 'First Name', ar: 'الاسم الأول' },
  'auth.last_name': { en: 'Last Name', ar: 'الاسم الأخير' },
  'auth.phone': { en: 'Phone Number', ar: 'رقم الهاتف' },
  'auth.governorate': { en: 'Governorate', ar: 'المحافظة' },
  'auth.login_title': { en: 'Welcome Back', ar: 'مرحبًا بعودتك' },
  'auth.signup_title': { en: 'Create Account', ar: 'إنشاء حساب' },
  'auth.no_account': { en: "Don't have an account?", ar: 'ليس لديك حساب؟' },
  'auth.have_account': { en: 'Already have an account?', ar: 'لديك حساب بالفعل؟' },
  'auth.forgot_password': { en: 'Forgot Password?', ar: 'نسيت كلمة المرور؟' },
  'auth.reset_password': { en: 'Reset Password', ar: 'إعادة تعيين كلمة المرور' },
  'auth.send_otp': { en: 'Send Verification Code', ar: 'إرسال رمز التحقق' },
  'auth.verify_otp': { en: 'Verify Code', ar: 'تأكيد الرمز' },
  'auth.new_password': { en: 'New Password', ar: 'كلمة المرور الجديدة' },
  'auth.login_btn': { en: 'Sign In', ar: 'تسجيل الدخول' },
  'auth.signup_btn': { en: 'Sign Up', ar: 'إنشاء الحساب' },

  // Dashboard
  'dash.overview': { en: 'Overview', ar: 'نظرة عامة' },
  'dash.products': { en: 'Products', ar: 'المنتجات' },
  'dash.categories': { en: 'Categories', ar: 'الأقسام' },
  'dash.orders': { en: 'Orders', ar: 'الطلبات' },
  'dash.stock': { en: 'Stock', ar: 'المخزون' },
  'dash.users': { en: 'Users', ar: 'المستخدمين' },
  'dash.total_orders': { en: 'Total Orders', ar: 'إجمالي الطلبات' },
  'dash.total_products': { en: 'Total Products', ar: 'إجمالي المنتجات' },
  'dash.total_revenue': { en: 'Total Revenue', ar: 'إجمالي الإيرادات' },
  'dash.low_stock': { en: 'Low Stock', ar: 'مخزون منخفض' },
  'dash.new_order': { en: 'New Order!', ar: 'طلب جديد!' },
  'dash.pending': { en: 'Pending', ar: 'قيد الانتظار' },
  'dash.confirmed': { en: 'Confirmed', ar: 'مؤكد' },
  'dash.shipped': { en: 'Shipped', ar: 'تم الشحن' },
  'dash.delivered': { en: 'Delivered', ar: 'تم التسليم' },
  'dash.cancelled': { en: 'Cancelled', ar: 'ملغي' },
  'dash.add_product': { en: 'Add Product', ar: 'إضافة منتج' },
  'dash.edit': { en: 'Edit', ar: 'تعديل' },
  'dash.delete': { en: 'Delete', ar: 'حذف' },
  'dash.save': { en: 'Save', ar: 'حفظ' },
  'dash.cancel': { en: 'Cancel', ar: 'إلغاء' },
  'dash.adjust_stock': { en: 'Adjust Stock', ar: 'تعديل المخزون' },
  'dash.reason': { en: 'Reason', ar: 'السبب' },
  'dash.manual_sale': { en: 'Manual Sale (Office)', ar: 'بيع يدوي (من المكتب)' },
  'dash.recent_orders': { en: 'Recent Orders', ar: 'أحدث الطلبات' },
  'dash.order_details': { en: 'Order Details', ar: 'تفاصيل الطلب' },
  'dash.customer': { en: 'Customer', ar: 'العميل' },
  'dash.status': { en: 'Status', ar: 'الحالة' },
  'dash.actions': { en: 'Actions', ar: 'إجراءات' },

  // Footer
  'footer.about': { en: 'About Us', ar: 'من نحن' },
  'footer.about_text': { en: 'Your trusted partner for premium laboratory and medical testing supplies across Egypt.', ar: 'شريكك الموثوق لمستلزمات المعامل والتحاليل الطبية المتميزة في كل مصر.' },
  'footer.quick_links': { en: 'Quick Links', ar: 'روابط سريعة' },
  'footer.contact': { en: 'Contact Us', ar: 'تواصل معنا' },
  'footer.rights': { en: 'All rights reserved', ar: 'جميع الحقوق محفوظة' },

  // General
  'general.loading': { en: 'Loading...', ar: 'جاري التحميل...' },
  'general.search': { en: 'Search products...', ar: 'ابحث عن منتجات...' },
  'general.no_results': { en: 'No results found', ar: 'لا توجد نتائج' },
  'general.back': { en: 'Back', ar: 'رجوع' },
  'general.submit': { en: 'Submit', ar: 'إرسال' },
  'general.required': { en: 'This field is required', ar: 'هذا الحقل مطلوب' },
};

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  currentLang = signal<Lang>(this.getSavedLang());

  constructor() {
    effect(() => {
      const lang = this.currentLang();
      document.documentElement.dir = 'ltr'; // Forces LTR layout so page doesn't flip
      document.documentElement.lang = lang;
      localStorage.setItem('lang', lang);
    });
  }

  private getSavedLang(): Lang {
    const saved = localStorage.getItem('lang');
    return (saved === 'ar' || saved === 'en') ? saved : 'en';
  }

  toggleLang(): void {
    this.currentLang.set(this.currentLang() === 'en' ? 'ar' : 'en');
  }

  setLang(lang: Lang): void {
    this.currentLang.set(lang);
  }

  t(key: string): string {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    return entry[this.currentLang()] || key;
  }

  /** For bilingual model fields like product.name */
  localize(obj: { en: string; ar: string } | undefined): string {
    if (!obj) return '';
    return obj[this.currentLang()] || obj['en'] || '';
  }
}
