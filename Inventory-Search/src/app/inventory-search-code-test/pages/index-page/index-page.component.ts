import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, InjectionToken, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, filter, finalize, map, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import { InventoryItem, InventoryItemSortableFields, InventorySearchQuery, SearchBy } from '../../models/inventory-search.models';
import { InventorySearchApiService } from '../../services/inventory-search-api.service';
import { ToastService } from '../../services/toast.service';

export const INVENTORY_SEARCH_DEBOUNCE_MS = new InjectionToken<number>('INVENTORY_SEARCH_DEBOUNCE_MS');

@Component({
    selector: 'inv-index-page',
    templateUrl: './index-page.component.html',
    styleUrls: ['./index-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class IndexPageComponent implements OnDestroy, OnInit, AfterViewInit {
    readonly defaultSortField: InventoryItemSortableFields = 'partNumber';
    readonly pageSize = 20;
    
    private readonly allBranches = ['CLT', 'DEN', 'SLC', 'SEA', 'STL', 'LAX'];

    private readonly debounceMs = 50;
    private readonly destroy$ = new Subject<void>();
    private readonly searchTrigger$ = new Subject<void>();
    private readonly sortState$ = new BehaviorSubject<{ field: InventoryItemSortableFields; direction: 'asc' | 'desc' }>({
        field: this.defaultSortField,
        direction: 'asc'
    });
    private readonly currentPage$ = new BehaviorSubject<number>(0);

    items$!: Observable<InventoryItem[]>;
    total$!: Observable<number>;
    readonly loading$ = new BehaviorSubject<boolean>(false);

    form: FormGroup;

    constructor(
        private readonly fb: FormBuilder,
        private readonly api: InventorySearchApiService,
        private readonly toastService: ToastService
    ) {
        this.form = this.fb.group({
            criteria: [''],
            by: ['PartNumber' as SearchBy, Validators.required],
            branches: [this.allBranches.slice()],
            onlyAvailable: [false],
        });
    }

    ngOnInit(): void {
        const search$ = this.searchTrigger$.pipe(
            takeUntil(this.destroy$),
            debounceTime(this.debounceMs),
            filter(() => this.form.valid),
            map(() => this.buildQuery()),
            switchMap((query) => {
                this.loading$.next(true);
                let cancelled = true;
                return this.api.search(query).pipe(
                    tap(() => {
                        cancelled = false;
                    }),
                    map((resp) => {
                        if (resp.isFailed || !resp.data) {
                            const message = resp.message ?? 'Search failed';
                            this.toastService.error(message ?? 'An unexpected error has occurred.');
                            return { total: -1, items: [] };
                        }
                        cancelled = false;
                        return resp.data;
                    }),
                    catchError((err) => {
                        const message = err?.message ?? 'Search failed';
                        this.toastService.error(message ?? 'An unexpected error has occurred.');
                        cancelled = false;
                        return of({ total: -1, items: [] });
                    }),
                    finalize(() => {
                        if (cancelled) {
                            this.toastService.info('Previous search cancelled.');
                        }
                        this.loading$.next(false);
                    })
                );
            }),
            shareReplay({ bufferSize: 1, refCount: true })
        );

        this.items$ = search$.pipe(map((r) => r.items));
        this.total$ = search$.pipe(map((r) => r.total));
    }

    ngAfterViewInit(): void {
        // delay initial search until view bindings are subscribed.
        Promise.resolve().then(() => this.onSearch());
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
        this.onSearch();
    }

    onPageChange(pageIndex: number) {
        this.currentPage$.next(pageIndex);
        this.searchTrigger$.next();
    }

    get currentPage(): number {
        return this.currentPage$.value;
    }

    private isSortable(field: keyof InventoryItem): field is InventoryItemSortableFields {
        return Object.prototype.hasOwnProperty.call(InventoryItemSortableFields, field);
    }

    private buildQuery(): InventorySearchQuery {
        const { criteria, by, branches = [], onlyAvailable } =
            this.form.value as {
                criteria: string;
                by: SearchBy;
                branches: string[] | undefined;
                onlyAvailable: boolean;
            };

        const sort = this.sortState$.value;

        return {
            criteria,
            by,
            branches,
            onlyAvailable,
            page: this.currentPage$.value,
            size: this.pageSize,
            ...(sort ? { sort } : {}),
        };
    }

    onSort(field: keyof InventoryItem) {
        if (!this.isSortable(field)) {
            return;
        }
        const current = this.sortState$.value;
        const direction: 'asc' | 'desc' = current.field === field && current.direction === 'asc' ? 'desc' : 'asc';
        this.sortState$.next({ field, direction });
        this.currentPage$.next(0);
        this.searchTrigger$.next();
    }
}
