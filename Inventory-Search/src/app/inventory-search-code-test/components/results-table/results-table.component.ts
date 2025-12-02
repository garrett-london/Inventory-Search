//components/results-table/results-table.component.ts

// TypeScript
import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {InventoryItem, PeakAvailability} from '../../models/inventory-search.models';
import { InventorySearchApiService } from '../../services/inventory-search-api.service';


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

  @Output() sort = new EventEmitter<keyof InventoryItem>();
  @Output() pageChange = new EventEmitter<number>();

  pageIndex = 0;
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
  ) {}

  onHeaderClick(field: keyof InventoryItem) {
    // The data to be sorted on the column
  }

  toggleExpand(item: InventoryItem) {
    // Toggle the expanded state of a row
  }


  // Fetch peak availability for a given item/part
  fetchPeakAvailability(item: InventoryItem) {
    // Needs to call the API to get the peak availability for the part
    // on an error
    // Failed to load peak availability along with any error returned by the API

  }

  // Convenience: fetch and expand inline panel
  onPeakButton(item: InventoryItem) {

    // Expand the row if not expanded

  }

  totalPages(total: number, size: number) {
    return Math.max(1, Math.ceil((total ?? 0) / (size || 1)));
  }

  goTo(page: number) {
    // go to specific page
  }
}
