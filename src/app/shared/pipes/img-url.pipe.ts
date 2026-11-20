import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'imgUrl',
  standalone: true
})
export class ImgUrlPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return 'assets/placeholder.png';
    // If already a full URL, blob or base64, return as-is
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:') || value.startsWith('data:')) {
      return value;
    }
    // Otherwise, prepend the uploads base URL
    return environment.uploadsUrl + value;
  }
}
