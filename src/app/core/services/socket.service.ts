import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { EMPTY, interval, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket?: Socket;
  /** Vercel serverless functions do not maintain persistent WebSocket connections */
  readonly isServerless = (environment.apiUrl || '').includes('vercel.app');

  constructor() {
    if (this.isServerless) {
      return;
    }
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
    if (this.isServerless || !this.socket) {
      return EMPTY;
    }
    return new Observable((subscriber) => {
      const handler = (data: any) => subscriber.next(data);
      this.socket?.on(eventName, handler);
      return () => {
        this.socket?.off(eventName, handler);
      };
    });
  }

  /** Falls back to lightweight polling in serverless environments where Socket.IO is inactive */
  pollInServerless(intervalMs: number = 25000): Observable<number> {
    return this.isServerless ? interval(intervalMs) : EMPTY;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
