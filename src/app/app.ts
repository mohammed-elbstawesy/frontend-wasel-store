import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from './shared/components/toast/toast';
import { ScrollTopComponent } from './shared/components/scroll-top/scroll-top';
import { ConfirmModal } from './shared/components/confirm-modal/confirm-modal';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: true,
  imports: [RouterOutlet, Toast, ScrollTopComponent, ConfirmModal],
})
export class App { }
