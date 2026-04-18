import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/users.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
      <h1 class="page-title" style="margin-bottom: 0;">{{ 'dash.users' | translate }}</h1>
      <input type="text" class="form-input" style="max-width: 300px; width: 100%;" 
             [placeholder]="ts.currentLang() === 'ar' ? 'بحث بالاسم، الإيميل، الهاتف...' : 'Search by name, email, phone...'"
             [(ngModel)]="searchQuery" (ngModelChange)="filterUsers()">
    </div>

    <div class="orders-nav">
      <button [class.active]="activeTab === 'active'" (click)="setTab('active')">
        {{ ts.currentLang() === 'ar' ? 'المستخدمين النشطين' : 'Active Users' }}
      </button>
      <button [class.active]="activeTab === 'disabled'" (click)="setTab('disabled')">
        {{ ts.currentLang() === 'ar' ? 'المعطلين' : 'Disabled Users' }}
      </button>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>{{ 'auth.first_name' | translate }}</th>
            <th>{{ 'auth.last_name' | translate }}</th>
            <th>{{ 'auth.email' | translate }}</th>
            <th>{{ 'auth.governorate' | translate }}</th>
            <th>{{ 'auth.phone' | translate }}</th>
            <th>{{ ts.currentLang() === 'ar' ? 'الدور' : 'Role' }}</th>
            @if (activeTab === 'disabled') {
              <th>{{ ts.currentLang() === 'ar' ? 'سبب التعطيل' : 'Suspension Reason' }}</th>
            }
            <th>{{ 'dash.actions' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          @for (user of filteredTabUsers; track user._id) {
            <tr>
              <td>{{ user.firstName }}</td>
              <td>{{ user.lastName }}</td>
              <td dir="ltr">{{ user.email }}</td>
              <td>{{ user.governorate }}</td>
              <td dir="ltr">{{ user.phone }}</td>
              <td><span class="badge" [class.badge-info]="user.role === 'admin'" [class.badge-neutral]="user.role === 'user'">{{ user.role }}</span></td>
              @if (activeTab === 'disabled') {
                <td style="color: var(--danger); font-size: 13px;">{{ user.suspensionReason || 'N/A' }}</td>
              }
              <td>
                <div style="display: flex; gap: 8px;">
                  @if (activeTab === 'active') {
                    <button class="btn btn-outline btn-sm" (click)="toggleRole(user)" 
                      [disabled]="!isMainAdmin() || user.email === 'mohammed3mto25mm@gmail.com'">
                      {{ user.role === 'admin' ? (ts.currentLang() === 'ar' ? 'تحويل لمستخدم' : 'Make User') : (ts.currentLang() === 'ar' ? 'ترقية لمدير' : 'Make Admin') }}
                    </button>
                    <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.15); color: var(--danger);" (click)="openSuspendModal(user)" 
                      [disabled]="user.email === 'mohammed3mto25mm@gmail.com' || (user.role === 'admin' && !isMainAdmin())">
                      {{ ts.currentLang() === 'ar' ? 'تعطيل' : 'Suspend' }}
                    </button>
                  } @else {
                     <button class="btn btn-sm" style="background: rgba(34, 197, 94, 0.15); color: var(--success);" (click)="reactivateUser(user)" 
                      [disabled]="user.email === 'mohammed3mto25mm@gmail.com'">
                      {{ ts.currentLang() === 'ar' ? 'تفعيل الحساب' : 'Reactivate' }}
                    </button>
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (filteredTabUsers.length === 0) {
      <p class="empty-text">
        {{ activeTab === 'active' 
            ? (ts.currentLang() === 'ar' ? 'لا يوجد مستخدمين نشطين' : 'No active users') 
            : (ts.currentLang() === 'ar' ? 'لا يوجد مستخدمين معطلين' : 'No disabled users') 
        }}
      </p>
    }

    <!-- Suspend Modal -->
    @if (selectedUserForSuspend) {
      <div class="modal-overlay" (click)="closeSuspendModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ ts.currentLang() === 'ar' ? 'تعطيل حساب المستخدم' : 'Suspend User Account' }}</h2>
            <button class="modal-close" (click)="closeSuspendModal()">✕</button>
          </div>
          <div class="modal-body">
            <p style="margin-bottom: 16px; font-size: 14px;">
              {{ ts.currentLang() === 'ar' ? 'أنت على وشك تعطيل حساب:' : 'You are about to suspend:' }} <strong>{{ selectedUserForSuspend.firstName }} {{ selectedUserForSuspend.lastName }}</strong>
            </p>
            <div class="form-group">
              <label class="form-label">{{ ts.currentLang() === 'ar' ? 'سبب التعطيل' : 'Suspension Reason' }} *</label>
              <textarea class="form-input" [(ngModel)]="suspensionReason" rows="3" [placeholder]="ts.currentLang() === 'ar' ? 'اكتب سبب لتعطيل الحساب ومنعه من الشراء...' : 'Write reason for suspension...'"></textarea>
            </div>
            <div class="modal-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 12px;">
              <button class="btn btn-ghost" (click)="closeSuspendModal()">{{ ts.currentLang() === 'ar' ? 'إلغاء' : 'Cancel' }}</button>
              <button class="btn btn-primary" style="background: var(--danger); border-color: var(--danger);" (click)="confirmSuspend()" [disabled]="!suspensionReason.trim() || isProcessing">
                {{ isProcessing ? '...' : (ts.currentLang() === 'ar' ? 'تأكيد التعطيل' : 'Confirm Suspend') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-title { font-size: 26px; font-weight: 700; }
    .empty-text { text-align: center; padding: 40px; color: var(--text-muted); }
    .orders-nav { display: flex; gap: 8px; background: var(--bg-card); padding: 12px; border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 20px; overflow-x: auto; scrollbar-width: none; }
    .orders-nav::-webkit-scrollbar { display: none; }
    .orders-nav button { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border: none; background: transparent; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600; color: var(--text-secondary); white-space: nowrap; transition: all 0.2s; }
    .orders-nav button:hover { background: rgba(0,0,0,0.03); }
    .orders-nav button.active { background: var(--surface); color: var(--primary); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-content { background: var(--bg-card); border-radius: var(--radius); max-width: 500px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
    .modal-header h2 { font-size: 18px; font-weight: 600; color: var(--danger); }
    .modal-close { font-size: 20px; color: var(--text-muted); background: none; border: none; cursor: pointer; }
    .modal-body { padding: 20px; }
  `]
})
export class Users implements OnInit {
  ts = inject(TranslationService);
  private userService = inject(UserService);
  private confirmService = inject(ConfirmService);
  private toastService = inject(ToastService);
  authService = inject(AuthService);

  users: User[] = [];
  filteredTabUsers: User[] = [];
  searchQuery = '';
  activeTab: 'active' | 'disabled' = 'active';

  selectedUserForSuspend: User | null = null;
  suspensionReason = '';
  isProcessing = false;

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe({
      next: (res: any) => {
        this.users = res;
        this.filterUsers();
      },
      error: () => { }
    });
  }

  setTab(tab: 'active' | 'disabled') {
    this.activeTab = tab;
    this.filterUsers();
  }

  filterUsers() {
    let result = this.users;

    // Filter by tab first
    result = result.filter(u => this.activeTab === 'active' ? !u.isSuspended : u.isSuspended);

    // Filter by search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(u =>
        (u.firstName && u.firstName.toLowerCase().includes(q)) ||
        (u.lastName && u.lastName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q))
      );
    }

    // Sort admins first
    this.filteredTabUsers = result.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return 0; // maintain relative order
    });
  }

  isMainAdmin(): boolean {
    const userData = this.authService.getUserData();
    if (!userData || !userData.id) return false;
    const currentUser = this.users.find(u => u._id === userData.id);
    if (!currentUser) return false;
    return currentUser.email === 'mohammed3mto25mm@gmail.com';
  }

  async toggleRole(user: User) {
    if (user.email === 'mohammed3mto25mm@gmail.com') {
      this.toastService.show(this.ts.currentLang() === 'ar' ? 'لا يمكن تعديل المدير الرئيسي' : 'Cannot modify main admin', 'error');
      return;
    }

    if (!this.isMainAdmin()) {
      this.toastService.show(this.ts.currentLang() === 'ar' ? 'المدير الرئيسي فقط له صلاحية تغيير الأدوار' : 'Only Superadmin can change roles', 'error');
      return;
    }

    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmed = await this.confirmService.ask(
      this.ts.currentLang() === 'ar'
        ? `هل أنت متأكد من تغيير صلاحية ${user.firstName} إلى ${newRole}؟`
        : `Are you sure you want to change ${user.firstName}'s role to ${newRole}?`,
      'warning'
    );

    if (confirmed) {
      this.userService.editUserStatus(user._id!, { role: newRole }).subscribe({
        next: () => {
          this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم تحديث الصلاحية' : 'Role updated completely', 'success');
          this.loadUsers();
        },
        error: (err) => {
          this.toastService.show(err.error?.message || 'Error updating role', 'error');
        }
      });
    }
  }

  openSuspendModal(user: User) {
    if (user.email === 'mohammed3mto25mm@gmail.com') return;
    this.selectedUserForSuspend = user;
    this.suspensionReason = '';
  }

  closeSuspendModal() {
    this.selectedUserForSuspend = null;
    this.suspensionReason = '';
  }

  confirmSuspend() {
    if (!this.selectedUserForSuspend || !this.suspensionReason.trim()) return;
    this.isProcessing = true;
    this.userService.editUserStatus(this.selectedUserForSuspend._id!, {
      isSuspended: true,
      suspensionReason: this.suspensionReason
    }).subscribe({
      next: () => {
        this.isProcessing = false;
        this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم تعطيل الحساب' : 'Account suspended successfully', 'success');
        this.closeSuspendModal();
        this.loadUsers();
      },
      error: (err) => {
        this.isProcessing = false;
        this.toastService.show(err.error?.message || 'Error suspending account', 'error');
      }
    });
  }

  async reactivateUser(user: User) {
    if (user.email === 'mohammed3mto25mm@gmail.com') return;
    const confirmed = await this.confirmService.ask(
      this.ts.currentLang() === 'ar'
        ? `هل أنت متأكد من تفعيل حساب ${user.firstName} مجدداً؟`
        : `Are you sure you want to reactivate ${user.firstName}?`,
      'info'
    );

    if (confirmed) {
      this.userService.editUserStatus(user._id!, { isSuspended: false }).subscribe({
        next: () => {
          this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم تفعيل الحساب' : 'Account reactivated completely', 'success');
          this.loadUsers();
        },
        error: (err) => {
          this.toastService.show(err.error?.message || 'Error reactivating account', 'error');
        }
      });
    }
  }
}