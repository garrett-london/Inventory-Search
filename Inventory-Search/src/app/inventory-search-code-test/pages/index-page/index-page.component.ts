// pages/index-page/index-page.component.ts

// TypeScript
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Subject, Observable, of } from 'rxjs';
import { debounceTime, filter, map, shareReplay, switchMap, takeUntil, tap, catchError, finalize } from 'rxjs/operators';
import { InventoryItem, InventorySearchQuery, SearchBy, InventoryItemSortableFields } from '../../models/inventory-search.models';
import { InventorySearchApiService } from '../../services/inventory-search-api.service';
import { InjectionToken } from '@angular/core';

type SortDir = 'asc' | 'desc';
interface SortState { field: InventoryItemSortableFields; direction: SortDir; }

// Configurable debounce for searches (defaults to 50ms)
export const INVENTORY_SEARCH_DEBOUNCE_MS = new InjectionToken<number>('INVENTORY_SEARCH_DEBOUNCE_MS');

@Component({
    selector: 'inv-index-page',
    templateUrl: './index-page.component.html',
    styleUrls: ['./index-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class IndexPageComponent implements OnDestroy, OnInit {
    readonly defaultSortField: InventoryItemSortableFields = 'partNumber';
    readonly defaultPageSize: number = 20;
    readonly pageSize$ = this.defaultPageSize;

    // - Define reactive controllers for: search trigger, sort state, and current page.
    private readonly destroy$ = new Subject<void>();
    private readonly searchTrigger$ = new Subject<void>();
    private readonly sortState$ = new BehaviorSubject<SortState>({ field: this.defaultSortField, direction: 'asc' });
    private readonly currentPage$ = new BehaviorSubject<number>(0);

    // - Expose public observables for: total count and items list derived from responses.
    items$!: Observable<InventoryItem[]>;
    total$!: Observable<number>;

    // - Track loading as a boolean BehaviorSubject toggled around requests.
    readonly loading$ = new BehaviorSubject<boolean>(false);

    // - Keep a simple string errorMessage to show failures inline.
    errorMessage: string | null = null;

    // - Keep a configurable debounce value (overridable via DI) for throttling user actions.
    private _debounce = 50;

    //- Create a form group with fields for criteria, by, branches, and onlyAvailable.
    form: FormGroup;

    constructor(
        private readonly fb: FormBuilder,
        private readonly api: InventorySearchApiService,
        @Inject(INVENTORY_SEARCH_DEBOUNCE_MS) @Optional() debounceMs: number | null
    ) {
        if (typeof debounceMs === 'number') {
            this._debounce = debounceMs;
        }
        this.form = this.fb.group({
            criteria: ['', Validators.required],
            by: ['PartNumber' as SearchBy, Validators.required],
            branches: [[] as string[]],
            onlyAvailable: [false],
        });
    }

    /**
     * Code challenge  high-level goal:
     * - Compose a reactive search pipeline driven by three inputs: manual search trigger, sort changes, and page changes.
     * - Debounce and transform those inputs into a typed query object, then execute the request while canceling stale ones.
     * - Expose loading, total count, and items as observables suitable for OnPush + async pipe.
     * - Handle failures with a simple inline message; keep all UI state separate from API concerns.
     * - Ensure proper cleanup of subscriptions and efficient re-use of the latest emissions.
     */

    ngOnInit(): void {
        const search$ = this.searchTrigger$.pipe(
            takeUntil(this.destroy$),
            debounceTime(this._debounce),
            filter(() => this.form.valid),
            tap(() => {
                this.errorMessage = null;
                this.loading$.next(true);
            }),
            map(() => this.buildQuery()),
            switchMap((query) =>
                this.api.search(query).pipe(
                    map((resp) => {
                        if (resp.isFailed || !resp.data) {
                            this.errorMessage = resp.message ?? 'Search failed';
                            return { total: 0, items: [] };
                        }
                        return resp.data;
                    }),
                    catchError(() => {
                        this.errorMessage = 'Search failed';
                        return of({ total: 0, items: [] });
                    }),
                    finalize(() => this.loading$.next(false))
                )
            ),
            shareReplay(1)
        );

        this.items$ = search$.pipe(map((r) => r.items));
        this.total$ = search$.pipe(map((r) => r.total));
    }

    onSearch() {
        if (this.form.invalid) {
            return;
        }
        this.currentPage$.next(0);
        this.searchTrigger$.next();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onEnterKey() {
        // basic debounce handled on query$ level; just trigger search
        this.onSearch();
    }

    onSort(field: keyof InventoryItem) {
        const current = this.sortState$.value;
        const direction: SortDir = current.field === field && current.direction === 'asc' ? 'desc' : 'asc';
        const sortable = this.getSortable({ field, direction });
        this.sortState$.next(sortable ?? { field: this.defaultSortField, direction });
        this.currentPage$.next(0);
        this.searchTrigger$.next();
    }

    onPageChange(pageIndex: number) {
        this.currentPage$.next(pageIndex);
        this.searchTrigger$.next();
    }

    // Handle branches input changes from template
    onBranchesChange(event: Event) {
        const target = event.target as HTMLSelectElement;
        const branches = Array.from(target.selectedOptions).map((o) => o.value);
        this.form.patchValue({ branches });
    }

    // Expose the current page index for template binding
    get currentPage(): number {
        return this.currentPage$.value;
    }

    // Narrow to sortable inventory fields
    isInventoryItemSortableField(
        field: keyof InventoryItem
    ): field is InventoryItemSortableFields {
        return Object.prototype.hasOwnProperty.call(InventoryItemSortableFields, field);
    }

    // Build a typed sort object when the field is supported
    getSortable(
        sortVal: { field: keyof InventoryItem; direction: SortDir }
    ): { field: InventoryItemSortableFields; direction: SortDir } | undefined {
        if (!this.isInventoryItemSortableField(sortVal.field)) {
            return undefined;
        }
        return {
            field: sortVal.field,
            direction: sortVal.direction,
        };
    }

    // Build the query
    private buildQuery(): InventorySearchQuery {
        const { criteria, by, branches = [], onlyAvailable } =
            this.form.value as {
                criteria: string;
                by: SearchBy;
                branches: string[] | undefined;
                onlyAvailable: boolean;
            };

        const sort = this.getSortable(this.sortState$.value);

        return {
            criteria,
            by,
            branches,
            onlyAvailable,
            page: this.currentPage$.value,
            size: this.pageSize$,
            ...(sort ? { sort } : {}),
        };
    }
}
