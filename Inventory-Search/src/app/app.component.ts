import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastMessage, ToastService } from './inventory-search-code-test/services/toast.service';



interface ToastEntry extends ToastMessage {
    id: number;
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit, OnDestroy {
    public readonly title = 'Inventory Search';
    private readonly destroy$ = new Subject<void>();
    private readonly maxToasts = 3;
    private readonly autoClearMs = 5000;
    private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

    toasts: ToastEntry[] = [];

    constructor(private readonly toastService: ToastService) { }

    ngOnInit(): void {
        this.toastService.toast$
            .pipe(takeUntil(this.destroy$))
            .subscribe((toast) => this.enqueueToast(toast));
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.clearTimers();
    }

    dismiss(id: number) {
        this.updateToasts(this.toasts.filter((t) => t.id !== id));
    }

    trackByToast = (_: number, toast: ToastEntry) => toast.id;

    private enqueueToast(message: ToastMessage) {
        const toast: ToastEntry = { ...message, id: Date.now() + Math.random() };
        this.updateToasts([toast, ...this.toasts].slice(0, this.maxToasts));
        this.startTimer(toast);
    }

    private updateToasts(next: ToastEntry[]) {
        const keep = new Set(next.map((t) => t.id));
        for (const [id, timer] of this.timers) {
            if (!keep.has(id)) {
                clearTimeout(timer);
                this.timers.delete(id);
            }
        }
        this.toasts = next;
    }

    private startTimer(toast: ToastEntry) {
        if (this.autoClearMs <= 0) {
            return;
        }
        const timer = setTimeout(() => this.dismiss(toast.id), this.autoClearMs);
        this.timers.set(toast.id, timer);
    }

    private clearTimers() {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
    }
}
