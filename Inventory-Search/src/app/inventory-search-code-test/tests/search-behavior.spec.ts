import { fakeAsync, tick } from '@angular/core/testing';
import { Observable, Subject, throwError } from 'rxjs';
import { IndexPageComponent } from '../pages/index-page/index-page.component';
import { InventorySearchApiService, INVENTORY_API_BASE } from '../services/inventory-search-api.service';
import { ToastService } from '../services/toast.service';
import { InventoryItem, PagedInventoryResponse } from '../models/inventory-search.models';
import { FormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

const DEBOUNCE = 50;
const DEBOUNCE_TICK = DEBOUNCE + 10;

describe('Search behavior', () => {
    describe('IndexPageComponent cancellation', () => {
        class MockApi {
            calls = 0;
            cancellations = 0;
            readonly subscribers: Array<Subject<any>> = [];

            search = jasmine.createSpy('search').and.callFake((query: any) => {
                this.calls++;
                const subj = new Subject<any>();
                this.subscribers.push(subj);

                return new Observable((subscriber) => {
                    const sub = subj.subscribe(subscriber);
                    return () => {
                        sub.unsubscribe();
                        this.cancellations++;
                    };
                });
            });
        }

        let api: MockApi;
        let component: IndexPageComponent;
        let toast: jasmine.SpyObj<ToastService>;
        let itemsSub: any;

        beforeEach(() => {
            toast = jasmine.createSpyObj<ToastService>('ToastService', [
                'info',
                'error',
                'success',
                'warning',
            ]);

            api = new MockApi();
            component = new IndexPageComponent(
                new FormBuilder(),
                api as unknown as InventorySearchApiService,
                toast
            );
            component.ngOnInit();
            // Activate the search stream (mimics async pipe).
            itemsSub = component.items$.subscribe();
        });

        afterEach(() => {
            itemsSub?.unsubscribe();
        });

        it('cancels an in flight search when a new search starts and emits an info toast', fakeAsync(() => {
            component.onSearch();
            tick(DEBOUNCE_TICK); // allow debounce to elapse for first search

            expect(api.calls).toBe(1);

            component.onSearch(); // trigger second search, cancelling the first
            tick(DEBOUNCE_TICK);

            expect(api.calls).toBe(2);
            expect(api.cancellations).toBe(1);
            expect(toast.info).toHaveBeenCalledWith('Previous search cancelled.');

            // Complete the second search to avoid extra cancellation side effects.
            const resp: PagedInventoryResponse = { total: 1, items: [] as InventoryItem[] };
            api.subscribers[1].next({ isFailed: false, data: resp });
            api.subscribers[1].complete();
        }));

        it('shows loading while searching and clears after completion', fakeAsync(() => {
            component.onSearch();
            // Before debounce elapses, loading should still be false.
            expect(component.loading$.value).toBeFalse();

            tick(DEBOUNCE_TICK);
            expect(component.loading$.value).toBeTrue();

            const resp: PagedInventoryResponse = { total: 1, items: [] as InventoryItem[] };
            api.subscribers[0].next({ isFailed: false, data: resp });
            api.subscribers[0].complete();

            expect(component.loading$.value).toBeFalse();
        }));

        it('emits toast on error responses', fakeAsync(() => {
            component.onSearch();
            tick(DEBOUNCE_TICK);

            api.subscribers[0].next({ isFailed: true, message: 'boom' });
            api.subscribers[0].complete();

            expect(toast.error).toHaveBeenCalledWith('boom');
        }));

        it('emits toast on thrown errors', fakeAsync(() => {
            const failingApi = {
                search: () => throwError(() => new Error('explode')),
            } as unknown as InventorySearchApiService;

            const comp = new IndexPageComponent(new FormBuilder(), failingApi, toast);
            comp.ngOnInit();
            const sub = comp.items$.subscribe();

            comp.onSearch();
            tick(DEBOUNCE_TICK);

            expect(toast.error).toHaveBeenCalledWith('explode');
            sub.unsubscribe();
        }));

        it('builds queries with pagination and sorting applied', fakeAsync(() => {
            component.onPageChange(2);
            tick(DEBOUNCE_TICK);
            expect(api.calls).toBe(1);

            // Simulate completion so next sort can proceed cleanly.
            api.subscribers[0].next({ isFailed: false, data: { total: 1, items: [] } });
            api.subscribers[0].complete();

            component.onSort('branch');
            tick(DEBOUNCE_TICK);
            expect(api.calls).toBe(2);

            // The second call should be for page reset (0) with sort branch:asc.
            const lastQuery = api.search.calls.mostRecent().args[0];
            expect(lastQuery.page).toBe(0);
            expect(lastQuery.sort).toEqual({ field: 'branch', direction: 'asc' });
        }));
    });

    describe('InventorySearchApiService caching', () => {
        let service: InventorySearchApiService;
        let httpMock: HttpTestingController;

        beforeEach(() => {
            TestBed.configureTestingModule({
                imports: [HttpClientTestingModule],
                providers: [
                    InventorySearchApiService,
                    { provide: INVENTORY_API_BASE, useValue: 'http://example.test' },
                ],
            });

            service = TestBed.inject(InventorySearchApiService);
            httpMock = TestBed.inject(HttpTestingController);
        });

        afterEach(() => {
            httpMock.verify();
        });

        it('reuses cached responses for identical queries within TTL', () => {
            const query = {
                criteria: 'widget',
                by: 'PartNumber' as const,
                branches: ['SEA'],
                onlyAvailable: false,
                page: 0,
                size: 20,
            };

            let result1: PagedInventoryResponse | undefined;
            let result2: PagedInventoryResponse | undefined;

            service.search(query).subscribe((resp) => (result1 = resp.data));
            service.search(query).subscribe((resp) => (result2 = resp.data));

            const reqs = httpMock.match((req) => req.url.includes('/inventory/search'));
            expect(reqs.length).toBe(1); // only one HTTP call due to cache

            const payload: PagedInventoryResponse = { total: 2, items: [] };
            reqs[0].flush({ isFailed: false, data: payload });

            expect(result1).toEqual(payload);
            expect(result2).toEqual(payload);
        });

        it('expires cache after TTL and refetches', () => {
            let now = 1_000_000;
            spyOn(Date, 'now').and.callFake(() => now);

            const query = {
                criteria: 'ttl',
                by: 'PartNumber' as const,
                branches: [] as string[],
                onlyAvailable: false,
                page: 0,
                size: 20,
            };

            // First request hits the network.
            service.search(query).subscribe();
            const req = httpMock.expectOne((req) => req.url.includes('/inventory/search'));
            req.flush({ isFailed: false, data: { total: 1, items: [] } });

            // Within TTL, should hit cache.
            service.search(query).subscribe();
            httpMock.expectNone((req) => req.url.includes('/inventory/search'));

            // Advance beyond TTL and expect a new request.
            now += 61_000;
            service.search(query).subscribe();
            const req2 = httpMock.expectOne((req) => req.url.includes('/inventory/search'));
            req2.flush({ isFailed: false, data: { total: 1, items: [] } });
        });

        it('evicts oldest entry beyond 5 cached searches', () => {
            const base = {
                criteria: 'q',
                by: 'PartNumber' as const,
                branches: [] as string[],
                onlyAvailable: false,
                page: 0,
                size: 20,
            };

            // Fill cache with 5 unique queries.
            for (let i = 0; i < 5; i++) {
                service.search({ ...base, criteria: `q${i}` }).subscribe();
                httpMock
                    .expectOne((req) => req.url.includes('/inventory/search'))
                    .flush({ isFailed: false, data: { total: 1, items: [] } });
            }

            // Sixth unique query should evict the oldest.
            service.search({ ...base, criteria: 'q5' }).subscribe();
            httpMock
                .expectOne((req) => req.url.includes('/inventory/search'))
                .flush({ isFailed: false, data: { total: 1, items: [] } });

            // Original first query should now miss the cache and trigger a new request.
            service.search({ ...base, criteria: 'q0' }).subscribe();
            httpMock
                .expectOne((req) => req.url.includes('/inventory/search'))
                .flush({ isFailed: false, data: { total: 1, items: [] } });
        });
    });
});
