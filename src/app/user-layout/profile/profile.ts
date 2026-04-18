import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { CommonModule } from '@angular/common';
import { TranslationService } from '../../core/services/translation.service';
import { inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { jwtDecode } from 'jwt-decode';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../core/services/toast.service';
import { ImgUrlPipe } from '../../shared/pipes/img-url.pipe';
import { FallbackImageDirective } from '../../shared/directives/fallback-image.directive';
import { ImageCroppedEvent, ImageCropperComponent, ImageTransform } from 'ngx-image-cropper';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule, ImgUrlPipe, FallbackImageDirective, ImageCropperComponent, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  ts = inject(TranslationService);
  profileForm: FormGroup;
  isEditMode: boolean = false;
  userId: string = ''; 
  user: any = {}; 
  // Modal States
  isPhotoViewerOpen = false;
  isCropperModalOpen = false;
  isUploadingPicture = false;

  showPassword = false;
  showConfirmPassword = false;

  // Cropper State
  imageChangedEvent: Event | null = null;
  imageURL: string = '';
  blobToUpload: Blob | null = null;
  transform: ImageTransform = {};
  zoomValue = 1;

  readonly passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;

  constructor(
    private _router:Router,
    private fb: FormBuilder,
    private userService: UserService,
    private _authService:AuthService,
    private toastService: ToastService
  ) {

    this.profileForm = this.fb.group({
      firstName: ['', Validators.required], 
      lastName: ['', Validators.required],
      password: ['', [Validators.pattern(this.passwordRegex), Validators.minLength(0)]],
      confirmPassword: [''],
      governorate: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^\\+?[0-9\\s-]+$')]],
    }, { validators: this.passwordMatchValidator,
       updateOn: 'change'});
  }
  
    get pass() { return this.profileForm.get('password'); }
  hasLowerCase() { return /[a-z]/.test(this.pass?.value || ''); }
  hasUpperCase() { return /[A-Z]/.test(this.pass?.value || ''); }
  hasNumber() { return /\d/.test(this.pass?.value || ''); }
  hasSpecial() { return /[@$!%*?&]/.test(this.pass?.value || ''); }
  hasMinLength() { return (this.pass?.value || '').length >= 8; }


  ngOnInit(): void {

    this.userIdByToken()




    this.loadUserData();
  }



  token:any=''

  userIdByToken(){
    this.token = this._authService.getToken() 
    if(this.token){
      this.token = jwtDecode(this.token)
      this.userId = this.token.id
    }
  }

  loadUserData() {
    this.userService.getUser(this.userId).subscribe({
      next: (res: any) => {
        this.user = res.data || res; 
        
        
        this.profileForm.patchValue({
          firstName: this.user.firstName,
          lastName: this.user.lastName,
          governorate: this.user.governorate,
          phone: this.user.phone,
          password: '' 
        });
      },
      error: (err) => console.error('Failed to load user', err)
    });
  }

  enableEdit() {
    this.isEditMode = true;
  }

  cancelEdit() {
    this.isEditMode = false;
    this.profileForm.patchValue(this.user); 
    this.profileForm.get('password')?.setValue('');
    this.profileForm.get('confirmPassword')?.setValue('');
  }

  passwordMatchValidator(control: AbstractControl) {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword');

  if (!password && !confirmPassword?.value) {
    confirmPassword?.setErrors(null);
    return null;
  }

  if (password !== confirmPassword?.value) {
    confirmPassword?.setErrors({ mismatch: true });
    return { mismatch: true };
  } 

  confirmPassword?.setErrors(null);
  return null;
}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // --- LinkedIn-style Photo Workflow ---
  openPhotoViewer() {
    this.isPhotoViewerOpen = true;
  }

  closePhotoViewer() {
    this.isPhotoViewerOpen = false;
  }

  fileChangeEvent(event: Event): void {
    const el = event.target as HTMLInputElement;
    if (el.files && el.files.length > 0) {
      this.isPhotoViewerOpen = false;
      this.imageChangedEvent = event;
      this.imageURL = ''; // Clear image url to prioritize file
      this.resetCropper();
      this.isCropperModalOpen = true;
    }
  }

  editCurrentPhoto() {
    if (this.user.image) {
      this.imageURL = new ImgUrlPipe().transform(this.user.image);
      this.imageChangedEvent = null;
      this.isPhotoViewerOpen = false;
      this.resetCropper();
      this.isCropperModalOpen = true;
    }
  }

  deletePhoto() {
    this.isUploadingPicture = true;
    const formData = new FormData();
    formData.append('image', ''); 

    this.userService.updateUser(this.userId, formData as any).subscribe({
      next: () => {
        this.user.image = '';
        this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم الحذف' : 'Picture deleted', 'success');
        this.closePhotoViewer();
        this.isUploadingPicture = false;
      },
      error: () => {
        this.toastService.show('Error', 'error');
        this.isUploadingPicture = false;
      }
    });
  }

  updateZoom(event: any) {
    this.zoomValue = parseFloat(event.target.value);
    this.transform = { ...this.transform, scale: this.zoomValue };
  }

  resetCropper() {
    this.zoomValue = 1;
    this.transform = { scale: 1 };
  }

  imageCropped(event: ImageCroppedEvent) {
    if (event.blob) {
      this.blobToUpload = event.blob;
    }
  }

  closeCropperModal() {
    this.isCropperModalOpen = false;
    this.imageChangedEvent = null;
    this.imageURL = '';
    this.blobToUpload = null;
    this.isUploadingPicture = false;
  }

  confirmCropAndUpload() {
    if (!this.blobToUpload) return;
    this.isUploadingPicture = true;

    const formData = new FormData();
    const file = new File([this.blobToUpload], 'profile.png', { type: 'image/png' });
    formData.append('image', file);

    this.userService.updateUser(this.userId, formData as any).subscribe({
      next: (res: any) => {
        this.user.image = res.data?.image || this.user.image;
        this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم التحديث!' : 'Profile picture updated!', 'success');
        this.closeCropperModal();
      },
      error: (err) => {
        this.toastService.show('Error', 'error');
        this.isUploadingPicture = false;
      }
    });
  }
  // -------------------------------

  onSubmit() {
    if (this.profileForm.invalid) {
      this.toastService.show('Please fill all required fields correctly.', 'error');
      return;
    }

    const vals = this.profileForm.value;
    
    // Create FormData
    const formData = new FormData();
    if (vals.firstName) formData.append('firstName', vals.firstName);
    if (vals.lastName) formData.append('lastName', vals.lastName);
    if (vals.governorate) formData.append('governorate', vals.governorate);
    formData.append('phone', vals.phone ? vals.phone.replace(/[\s-]/g, '') : '');
    
    if (vals.password) {
      formData.append('password', vals.password);
    }

    this.userService.updateUser(this.userId, formData as any).subscribe({
      next: (res: any) => {
        this.user = { ...this.user, ...vals };
        this.isEditMode = false; 
        this.profileForm.get('confirmPassword')?.setValue('');
        this.toastService.show(this.ts.currentLang() === 'ar' ? 'تم تحديث الحساب بنجاح!' : 'Profile updated successfully!', 'success');
      },
      error: (err) => {
        this.toastService.show(this.ts.currentLang() === 'ar' ? 'خطأ في تحديث البيانات' : 'Error updating profile', 'error');
        console.error(err);
      }
    });
  }
  routehome(){
    this._router.navigate(['']);
  }

  logoutUser() {
    this._authService.logout();
  }
}