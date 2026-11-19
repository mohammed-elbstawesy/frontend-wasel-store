import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket?: Socket;

  constructor() {
    try {
      const url = (environment.apiUrl || '').replace(/\/api\/?$/, '');
      this.socket = io(url, {
        reconnectionAttempts: 2,
        timeout: 4000,
        autoConnect: true
      });
    } catch {
      // Quietly ignore if connection setup fails
    }
  }

  listen(eventName: string): Observable<any> {
    return new Observable((subscriber) => {
      if (!this.socket) return;
      this.socket.on(eventName, (data: any) => {
        subscriber.next(data);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
