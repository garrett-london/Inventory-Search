//models/inventory-search.models.ts


// TypeScript
export type SearchBy = 'PartNumber' | 'Description' | 'SupplierSKU';

export interface InventorySearchQuery {
  criteria: string;
  by: SearchBy;
  branches: string[]; // e.g., ['SEA', 'PDX']
  onlyAvailable: boolean;
  page: number; // 0-based
  size: number; // page size
  sort?: { field: InventoryItemSortableFields; direction: 'asc' | 'desc' };
}

export type InventoryItemSortableFields =
  | 'partNumber'
  | 'description'
  | 'branch'
  | 'availableQty'
  | 'uom'
  | 'leadTimeDays'
  | 'lastPurchaseDate';

export interface InventoryItemLot {
  lotNumber: string;
  qty: number;
  expirationDate: string | null; // ISO
}

export interface InventoryItem {
  partNumber: string;
  supplierSku: string;
  description: string;
  branch: string;
  availableQty: number;
  uom: string;
  leadTimeDays: number | null;
  lastPurchaseDate: string | null; // ISO
  lots?: InventoryItemLot[];
}

export interface PagedInventoryResponse {
  total: number;
  items: InventoryItem[];
}

export interface ApiEnvelope<T> {
  isFailed: boolean;
  message?: string;
  data?: T;
}

export interface PeakAvailability {
  partNumber: string;
  totalAvailable: number;
  branches: Array<{ branch: string; qty: number }>;
}
