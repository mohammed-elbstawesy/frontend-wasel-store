import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { UserService } from '../../../core/services/user.service';
import { ThemeService } from '../../../core/services/theme.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ImgUrlPipe } from '../../../shared/pipes/img-url.pipe';
import { FallbackImageDirective } from '../../../shared/directives/fallback-image.directive';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe, ImgUrlPipe, FallbackImageDirective],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit {
  ts = inject(TranslationService);
  auth = inject(AuthService);
  cart = inject(CartService);
  userService = inject(UserService);
  themeService = inject(ThemeService);
  wishlistService = inject(WishlistService);

  mobileMenuOpen = false;
  userMenuOpen = false;
  userProfile: any = null;

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    const tokenData = this.auth.getUserData();
    if (tokenData && tokenData.id) {
      this.userService.getUser(tokenData.id).subscribe({
        next: (res: any) => {
          this.userProfile = res.data || res;
        },
        error: () => {
          this.userProfile = null;
        }
      });
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeMenus() {
    this.mobileMenuOpen = false;
    this.userMenuOpen = false;
  }

  toggleLang() {
    this.ts.toggleLang();
  }

  logout() {
    this.auth.logout();
    this.closeMenus();
  }
}