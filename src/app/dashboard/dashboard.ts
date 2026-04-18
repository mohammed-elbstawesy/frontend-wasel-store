import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslationService } from '../core/services/translation.service';
import { TranslatePipe } from '../shared/pipes/translate.pipe';
import { OrderService } from '../core/services/order.service';
import { AuthService } from '../core/services/auth.service';
import { SocketService } from '../core/services/socket.service';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  ts = inject(TranslationService);
  orderService = inject(OrderService);
  auth = inject(AuthService);
  socketService = inject(SocketService);
  themeService = inject(ThemeService);
  sidebarOpen = false;

  ngOnInit() {
    this.orderService.getOrders().subscribe();
    // Socket connection is initialized upon injection of socketService
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleLang() {
    this.ts.toggleLang();
  }

  toggleTheme() {
    this.themeService.toggle();
  }
}