import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
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
export class Navbar implements OnInit, OnDestroy {
  ts = inject(TranslationService);
  auth = inject(AuthService);
  cart = inject(CartService);
  userService = inject(UserService);
  themeService = inject(ThemeService);
  wishlistService = inject(WishlistService);

  mobileMenuOpen = false;
  userMenuOpen = false;
  userProfile: any = null;
  private subs: Subscription[] = [];

  ngOnInit() {
    this.subs.push(
      this.auth.authState$.subscribe((isLoggedIn) => {
        if (isLoggedIn) {
          this.loadUserProfile();
        } else {
          this.userProfile = null;
        }
      })
    );

    this.subs.push(
      this.userService.userUpdated$.subscribe(() => {
        if (this.auth.isLogin()) {
          this.loadUserProfile();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
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
    } else {
      this.userProfile = null;
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