import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
    level: 'info' | 'warning' | 'error' | 'success';
    text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
    private readonly toastSubject = new Subject<ToastMessage>();
    readonly toast$ = this.toastSubject.asObservable();

    show(message: ToastMessage) {
        this.toastSubject.next(message);
    }

    info(text: string) {
        this.show({ level: 'info', text });
    }

    warning(text: string) {
        this.show({ level: 'warning', text });
    }

    error(text: string) {
        this.show({ level: 'error', text });
    }

    success(text: string) {
        this.show({ level: 'success', text });
    }
}
