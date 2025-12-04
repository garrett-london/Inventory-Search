import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
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
export class ResultsTableComponent {
    @Input() items: InventoryItem[] | null = [];
    @Input() total = 0;
    @Input() pageSize = 20;
    @Input() pageIndex = 0;

    @Output() sort = new EventEmitter<keyof InventoryItem>();
    @Output() pageChange = new EventEmitter<number>();

    expanded: Record<string, boolean> = {};
    peakLoading: Record<string, boolean> = {};
    peakByPart: Record<string, PeakAvailability | null> = {};
    errorMessage: string | null = null;

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

    onHeaderClick(field: keyof InventoryItem) {
        this.sort.emit(field);
    }

    toggleExpand(item: InventoryItem) {
        const key = this.itemKey(item);
        this.expanded[key] = !this.expanded[key];
    }

    fetchPeakAvailability(item: InventoryItem) {
        const key = this.itemKey(item);
        this.errorMessage = null;
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
                        this.errorMessage = resp.message ?? 'Failed to load peak availability';
                        this.toastService.error(this.errorMessage);
                        return;
                    }
                    this.peakByPart[key] = resp.data;
                    this.errorMessage = null;
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
                    this.errorMessage = msg;
                    this.cdr.markForCheck();
                    this.toastService.error(msg);
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
}
