import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  
  /** 'dark' | 'light' */
  theme = signal<'dark' | 'light'>(this.getInitialTheme());

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const t = this.theme();
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('labstore-theme', t);
      }
    });
  }

  toggle() {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  isDark(): boolean {
    return this.theme() === 'dark';
  }

  private getInitialTheme(): 'dark' | 'light' {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('labstore-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      // Default to light (as requested by user)
      return 'light';
    }
    return 'light';
  }
}
