import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { InventoryItem, PeakAvailability } from '../../models/inventory-search.models';
import { InventorySearchApiService } from '../../services/inventory-search-api.service';
import { ToastService } from '../../services/toast.service';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'inventory-results-table',
    templateUrl: './results-table.component.html',
    styleUrls: ['./results-table.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ResultsTableComponent implements OnChanges {
    @Input() items: InventoryItem[] | null = [];
    @Input() total = 0;
    @Input() pageSize = 20;
    @Input() pageIndex = 0;

    @Output() sort = new EventEmitter<keyof InventoryItem>();
    @Output() pageChange = new EventEmitter<number>();

    expanded: Record<string, boolean> = {};
    peakLoading: Record<string, boolean> = {};
    peakByPart: Record<string, PeakAvailability | null> = {};
    totalResults: number = -1;

    headers: Array<{ label: string; field: keyof InventoryItem; sortable: boolean }> = [
        { label: 'Part Number', field: 'partNumber', sortable: true },
        { label: 'Supplier SKU', field: 'supplierSku', sortable: false },
        { label: 'Description', field: 'description', sortable: true },
        { label: 'Branch', field: 'branch', sortable: true },
        { label: 'Available', field: 'availableQty', sortable: true },
        { label: 'UOM', field: 'uom', sortable: true },
        { label: 'Lead Time (days)', field: 'leadTimeDays', sortable: true },
        { label: 'Last Purchase', field: 'lastPurchaseDate', sortable: true },
    ];

    constructor(
        private readonly api: InventorySearchApiService,
        private readonly cdr: ChangeDetectorRef,
        private readonly toastService: ToastService,
    ) { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['total']) {
            var next = changes['total'].currentValue;
            if (typeof next === 'number')
                next = next > 0 ? next : -1;
            else
                next = -1;
            this.totalResults = next;
        }
    }

    onHeaderClick(field: keyof InventoryItem) {
        this.sort.emit(field);
    }

    toggleExpand(item: InventoryItem) {
        const key = this.itemKey(item);
        this.expanded[key] = !this.expanded[key];
    }

    fetchPeakAvailability(item: InventoryItem) {
        const key = this.itemKey(item);
        this.peakLoading[key] = true;

        this.api
            .getPeakAvailability(item.partNumber)
            .pipe(
                finalize(() => {
                    this.peakLoading[key] = false;
                    this.cdr.markForCheck();
                })
            )
            .subscribe({
                next: (resp) => {
                    if (resp.isFailed || !resp.data) {
                        this.peakByPart[key] = null;
                        const message = resp.message ?? 'Failed to load peak availability';
                        this.toastService.error(message);
                        return;
                    }
                    this.peakByPart[key] = resp.data;
                    this.cdr.markForCheck();
                },
                error: (err) => {
                    this.peakByPart[key] = null;
                    const msg =
                        typeof err === 'string'
                            ? err
                            : err?.message ??
                            err?.error?.message ??
                            'Failed to load peak availability';
                    this.toastService.error(msg);
                    this.cdr.markForCheck();
                },
            });
    }

    onPeakButton(item: InventoryItem) {
        const key = this.itemKey(item);

        if (this.peakLoading[key] || this.peakByPart[key]) {
            return;
        }

        if (!this.expanded[key]) {
            this.expanded[key] = true;
        }

        this.fetchPeakAvailability(item);
    }

    totalPages(total: number, size: number) {
        return Math.max(1, Math.ceil((total ?? 0) / (size || 1)));
    }

    goTo(page: number) {
        const totalPages = this.totalPages(this.total, this.pageSize);
        const next = Math.min(Math.max(page, 0), Math.max(0, totalPages - 1));
        if (next === this.pageIndex) {
            return;
        }
        this.pageIndex = next;
        this.pageChange.emit(next);
    }

    itemKey(item: InventoryItem) {
        return `${item.partNumber}|${item.branch}`;
    }

    trackByItem = (_: number, item: InventoryItem) => this.itemKey(item);

    peakFor(item: InventoryItem): PeakAvailability | null | undefined {
        return this.peakByPart[this.itemKey(item)];
    }

    showingRange() {
        if (this.totalResults < 0 || (this.items?.length ?? 0) === 0) {
            return null;
        }
        const start = this.pageIndex * this.pageSize + 1;
        const end = Math.min(this.totalResults, start + this.pageSize - 1);
        return { start, end };
    }
}
