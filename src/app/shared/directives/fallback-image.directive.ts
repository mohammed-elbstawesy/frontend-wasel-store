import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: 'img',
  standalone: true
})
export class FallbackImageDirective {

  constructor(private el: ElementRef<HTMLImageElement>) {}

  @HostListener('error')
  onError(): void {
    const element = this.el.nativeElement;
    
    // Prevent infinite loops if default avatar fails
    if (!element.dataset['fallbackApplied']) {
      element.dataset['fallbackApplied'] = 'true';
      
      const altText = element.alt || 'Item';
      let initials = altText.substring(0, 2).toUpperCase();
      if (!initials.trim()) initials = 'RC';
      
      let hash = 0;
      for (let i = 0; i < altText.length; i++) {
        hash = altText.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash % 360);
      const bgColor = `hsl(${hue}, 75%, 60%)`;
      const textColor = '#ffffff';

      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
          <rect width="200" height="200" fill="${bgColor}"/>
          <text x="100" y="105" font-family="system-ui, -apple-system, sans-serif" font-size="65" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
        </svg>
      `;
      element.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      element.style.objectFit = 'cover';
    }
  }
}
