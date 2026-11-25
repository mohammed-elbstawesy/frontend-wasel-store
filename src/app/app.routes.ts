import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin-guard';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-layout/user-layout').then(m => m.UserLayout),
    children: [
      { path: '', loadComponent: () => import('./user-layout/home/home').then(m => m.Home) },
      { path: 'categories', loadComponent: () => import('./user-layout/categories/categories').then(m => m.Categories) },
      { path: 'category/:catId', loadComponent: () => import('./user-layout/products-list/products-list').then(m => m.ProductsList) },
      { path: 'category/:catId/:subCatId', loadComponent: () => import('./user-layout/products-list/products-list').then(m => m.ProductsList) },
      { path: 'product/:id', loadComponent: () => import('./user-layout/product-details/product-details').then(m => m.ProductDetails) },
      { path: 'cart', loadComponent: () => import('./user-layout/cart/cart').then(m => m.Cart) },
      { path: 'checkout', canActivate: [authGuard], loadComponent: () => import('./checkout/checkout').then(m => m.Checkout) },
      { path: 'profile', loadComponent: () => import('./user-layout/profile/profile').then(m => m.Profile) },
      { path: 'my-orders', loadComponent: () => import('./user-layout/my-orders/my-orders').then(m => m.MyOrders) },
      { path: 'products', loadComponent: () => import('./user-layout/our-products/our-products').then(m => m.OurProducts) },
      { path: 'wishlist', loadComponent: () => import('./user-layout/wishlist/wishlist').then(m => m.Wishlist) },
      {
        path: 'login',
        loadComponent: () => import('./user-layout/login/login').then(m => m.Login),
        children: [
          { path: 'signin', loadComponent: () => import('./user-layout/login/sign-in/sign-in').then(m => m.SignIn) },
          { path: 'signup', loadComponent: () => import('./user-layout/login/sign-up/sign-up').then(m => m.SignUp) },
          { path: 'forgot-password', loadComponent: () => import('./user-layout/login/forgot-password/forgot-password').then(m => m.ForgotPassword) },
          { path: 'verify', loadComponent: () => import('./user-layout/login/verify-otp/verify-otp').then(m => m.VerifyOtp) },
          { path: 'reset-password', loadComponent: () => import('./user-layout/login/reset-password/reset-password').then(m => m.ResetPassword) },
          { path: '', redirectTo: 'signin', pathMatch: 'full' },
        ],
      },
    ],
  },
  {
    path: 'dashboard',
    canActivate: [adminGuard],
    loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard),
    children: [
      { path: '', loadComponent: () => import('./dashboard/pages/overview/overview').then(m => m.Overview) },
      { path: 'orders', loadComponent: () => import('./dashboard/pages/orders/orders').then(m => m.Orders) },
      { path: 'delivered-orders', loadComponent: () => import('./dashboard/pages/delivered-orders/delivered-orders').then(m => m.DeliveredOrders) },
      { path: 'manual-order', loadComponent: () => import('./dashboard/pages/manual-order/manual-order').then(m => m.ManualOrder) },
      { path: 'products', loadComponent: () => import('./dashboard/pages/products/products').then(m => m.AdminProducts) },
      { path: 'categories', loadComponent: () => import('./dashboard/pages/admin-categories/admin-categories').then(m => m.AdminCategories) },
      { path: 'discounts', loadComponent: () => import('./dashboard/pages/discounts/discounts').then(m => m.Discounts) },
      { path: 'coupons', loadComponent: () => import('./dashboard/pages/coupons/coupons').then(m => m.AdminCoupons) },
      { path: 'stock', loadComponent: () => import('./dashboard/pages/stock/stock').then(m => m.StockManagement) },
      { path: 'users', loadComponent: () => import('./dashboard/pages/users/users').then(m => m.Users) },
      { path: 'logs', loadComponent: () => import('./dashboard/pages/logs/logs').then(m => m.Logs) },
    ],
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];