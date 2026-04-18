import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../core/services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ImgUrlPipe } from '../../shared/pipes/img-url.pipe';
import { FallbackImageDirective } from '../../shared/directives/fallback-image.directive';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models/category.model';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, ImgUrlPipe, FallbackImageDirective],
  template: `
    <div class="container page">
      <div class="page-header">
        <h1 class="page-title">{{ 'nav.categories' | translate }}</h1>
        <p class="page-subtitle">{{ ts.currentLang() === 'ar' ? 'تصفح جميع أقسام منتجاتنا.' : 'Browse all our product categories.' }}</p>
      </div>
      <div class="cat-grid">
        @for (cat of categories; track cat._id) {
          <a [routerLink]="['/category', cat._id]" class="cat-card animate-fadeIn">
            <div class="cat-img-wrapper">
              <img [src]="cat.image | imgUrl" [alt]="ts.localize(cat.name)" class="cat-img">
              <div class="cat-overlay"></div>
            </div>
            <div class="cat-info">
              <h2 class="cat-name">{{ ts.localize(cat.name) }}</h2>
              <div class="sub-list">
                @for (sub of cat.subCategories; track sub._id) {
                  <span class="sub-tag">{{ ts.localize(sub.name) }}</span>
                }
              </div>
            </div>
          </a>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 40px 16px; }
    .page-header { text-align: center; margin-bottom: 48px; }
    .page-title { 
      font-size: 32px; 
      font-weight: 800; 
      margin-bottom: 8px; 
      color: var(--text);
      letter-spacing: -0.5px;
    }
    .page-subtitle { color: var(--text-muted); font-size: 16px; }
    
    .cat-grid { display: grid; gap: 16px; grid-template-columns: repeat(2, 1fr); }
    
    .cat-card {
      background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border);
      overflow: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column;
      box-shadow: var(--shadow-sm);
    }
    .cat-card:hover { transform: translateY(-4px) scale(1.01); box-shadow: var(--shadow-md); border-color: var(--border-hover); }
    
    .cat-img-wrapper { position: relative; width: 100%; height: 140px; overflow: hidden; }
    .cat-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
    .cat-card:hover .cat-img { transform: scale(1.05); }
    
    .cat-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%);
      opacity: 0.8;
    }
    
    .cat-info { padding: 12px; flex: 1; display: flex; flex-direction: column; }
    .cat-name { font-size: 16px; font-weight: 700; margin-bottom: 8px; color: var(--text); line-height: 1.3; transition: color 0.2s; }
    .cat-card:hover .cat-name { color: var(--primary); }
    
    .sub-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }
    .sub-tag {
      padding: 2px 8px; background: var(--bg-secondary); color: var(--text-secondary);
      border-radius: 100px; font-size: 11px; font-weight: 600;
      transition: all 0.2s; border: 1px solid var(--border);
    }
    .cat-card:hover .sub-tag { background: var(--primary-light); color: var(--primary); border-color: rgba(245, 166, 35, 0.2); }
    
    @media (min-width: 640px) { 
        .cat-grid { gap: 24px; } 
        .cat-info { padding: 20px; }
        .cat-name { font-size: 20px; margin-bottom: 12px; }
        .sub-tag { padding: 4px 10px; font-size: 12px; }
        .cat-img-wrapper { height: 160px; }
        .sub-list { gap: 8px; }
    }
    @media (min-width: 1024px) { 
      .page { padding: 64px 16px; }
      .cat-grid { grid-template-columns: repeat(3, 1fr); gap: 32px; } 
      .cat-img-wrapper { height: 200px; }
      .page-title { font-size: 40px; }
    }
  `]
})
export class Categories implements OnInit {
  ts = inject(TranslationService);
  categoryService = inject(CategoryService);
  categories: Category[] = [];

  ngOnInit() {
    this.categoryService.getCategories().subscribe(c => this.categories = c);
  }
}
