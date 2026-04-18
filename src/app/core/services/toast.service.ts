import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  toasts$ = this.toastsSubject.asObservable();
  private nextId = 0;

  show(message: string, type: 'error' | 'success' | 'info' = 'error') {
    const toast: ToastMessage = { id: this.nextId++, message, type };
    let currentToasts = this.toastsSubject.value;
    
    // Keep max 2 toasts visible (new one + 1 older)
    if (currentToasts.length >= 2) {
      currentToasts = currentToasts.slice(currentToasts.length - 1);
    }
    
    this.toastsSubject.next([...currentToasts, toast]);

    // Remove automatically after 5 seconds
    setTimeout(() => {
      this.remove(toast.id);
    }, 5000);
  }

  remove(id: number) {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(t => t.id !== id));
  }
}
