import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, InjectionToken } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, filter, finalize, map, switchMap, takeUntil, tap } from 'rxjs/operators';
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
export class IndexPageComponent implements OnDestroy, OnInit {
    readonly defaultSortField: InventoryItemSortableFields = 'partNumber';
    readonly pageSize = 20;

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
    errorMessage: string | null = null;

    form: FormGroup;

    constructor(
        private readonly fb: FormBuilder,
        private readonly api: InventorySearchApiService,
        private readonly toastService: ToastService
    ) {
        this.form = this.fb.group({
            criteria: ['', Validators.required],
            by: ['PartNumber' as SearchBy, Validators.required],
            branches: [[] as string[]],
            onlyAvailable: [false],
        });
    }

    ngOnInit(): void {
        const search$ = this.searchTrigger$.pipe(
            takeUntil(this.destroy$),
            debounceTime(this.debounceMs),
            filter(() => !this.loading$.value && this.form.valid),
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
                            this.toastService.error(this.errorMessage ?? 'An unexpected error has occurred.');
                            return { total: 0, items: [] };
                        }
                        return resp.data;
                    }),
                    catchError((err) => {
                        this.errorMessage = err?.message ?? 'Search failed';
                        this.toastService.error(this.errorMessage ?? 'An unexpected error has occurred.');
                        return of({ total: 0, items: [] });
                    }),
                    finalize(() => this.loading$.next(false))
                )
            )
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
        if (!this.loading$.value) {
            this.onSearch();
        }
    }

    onPageChange(pageIndex: number) {
        if (this.loading$.value) {
            return;
        }
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
