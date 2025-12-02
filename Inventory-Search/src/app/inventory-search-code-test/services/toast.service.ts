// services/toast.service.ts

// TypeScript
import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

export interface ToastMessage {
  level: 'info' | 'warning' | 'error' | 'success';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
// TODO Implement the required code
}
