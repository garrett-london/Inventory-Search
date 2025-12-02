//components/results-table/results-table.component.ts

// TypeScript
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { InventoryItem, PeakAvailability } from '../../models/inventory-search.models';
import { InventorySearchApiService } from '../../services/inventory-search-api.service';
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
    // Added: keep per-part peak availability and loading state
    peakLoading: Record<string, boolean> = {};
    peakByPart: Record<string, PeakAvailability | null> = {};
    // Simple inline error message
    errorMessage: string | null = null;

    headers: Array<{ label: string; field: keyof InventoryItem }> = [
        { label: 'Part Number', field: 'partNumber' },
        { label: 'Supplier SKU', field: 'supplierSku' },
        { label: 'Description', field: 'description' },
        { label: 'Branch', field: 'branch' },
        { label: 'Available', field: 'availableQty' },
        { label: 'UOM', field: 'uom' },
        { label: 'Lead Time (days)', field: 'leadTimeDays' },
        { label: 'Last Purchase', field: 'lastPurchaseDate' },
    ];

    constructor(
        private readonly api: InventorySearchApiService,
        private readonly cdr: ChangeDetectorRef,
    ) { }

    onHeaderClick(field: keyof InventoryItem) {
        // The data to be sorted on the column
        this.sort.emit(field);
    }

    toggleExpand(item: InventoryItem) {
        // Toggle the expanded state of a row
        const key = this.itemKey(item);
        this.expanded[key] = !this.expanded[key];
    }


    // Fetch peak availability for a given item/part
    fetchPeakAvailability(item: InventoryItem) {
        const key = this.itemKey(item);
        this.errorMessage = null;
        this.peakLoading[key] = true;

        // Needs to call the API to get the peak availability for the part
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
                        return;
                    }
                    this.peakByPart[key] = resp.data;
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
                },
            });
    }

    // Convenience: fetch and expand inline panel
    onPeakButton(item: InventoryItem) {
        const key = this.itemKey(item);
        // Expand the row if not expanded
        if (!this.expanded[key]) {
            this.expanded[key] = true;
        }
        if (!this.peakByPart[key] && !this.peakLoading[key]) {
            this.fetchPeakAvailability(item);
        }
    }

    totalPages(total: number, size: number) {
        return Math.max(1, Math.ceil((total ?? 0) / (size || 1)));
    }

    goTo(page: number) {
        // go to specific page
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
