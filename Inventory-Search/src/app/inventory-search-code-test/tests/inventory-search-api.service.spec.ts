// tests/inventory-search-api.service.spec.ts
// TypeScript
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { INVENTORY_API_BASE, InventorySearchApiService } from '../services/inventory-search-api.service';
import { InventorySearchQuery } from '../models/inventory-search.models';
import { take } from 'rxjs/operators';

describe('InventorySearchApiService', () => {
    let svc: InventorySearchApiService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [{ provide: INVENTORY_API_BASE, useValue: '/api' }],
        });

        svc = TestBed.inject(InventorySearchApiService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('caches identical requests for 60s', () => {
        const q: InventorySearchQuery = {
            criteria: 'ABC',
            by: 'PartNumber',
            branches: ['SEA'],
            onlyAvailable: false,
            page: 0,
            size: 20,
        };
        let calls = 0;

        const sub1 = svc.search(q).pipe(take(1)).subscribe(() => {
            calls++;
        });

        //const req1 = http.expectOne(r => r.method === 'GET' && r.url === '/api/inventory/search');
        const req1 = http.expectOne(
            r => r.method === 'GET' && r.url.startsWith('/api/inventory/search')
        );
        req1.flush({ isFailed: false, data: { total: 0, items: [] } });

        // 2nd call with same query should not fire a new HTTP request (served from cache)
        const sub2 = svc.search(q).pipe(take(1)).subscribe(() => {
            calls++;
        });
        //http.expectNone('/api/inventory/search');
        http.expectNone(r => r.url.startsWith('/api/inventory/search'));

        sub1.unsubscribe();
        sub2.unsubscribe();

        expect(calls).toBe(2);

    });

       it('avoids duplicate calls within 60 seconds and expires afterward', () => {
        const q: InventorySearchQuery = {
            criteria: 'ttl-test',
            by: 'PartNumber',
            branches: [],
            onlyAvailable: false,
            page: 0,
            size: 10,
        };

        let now = 1_000_000;
        spyOn(Date, 'now').and.callFake(() => now);

        let deliveries = 0;

        svc.search(q).pipe(take(1)).subscribe(() => deliveries++);
        http
            .expectOne(r => r.url.startsWith('/api/inventory/search'))
            .flush({ isFailed: false, data: { total: 0, items: [] } });

        // Within TTL, no new HTTP request should be made.
        now += 59_000;
        svc.search(q).pipe(take(1)).subscribe(() => deliveries++);
        http.expectNone(r => r.url.startsWith('/api/inventory/search'));

        // After TTL elapses, the next call should reach the server again.
        now += 1_000;
        svc.search(q).pipe(take(1)).subscribe(() => deliveries++);
        http
            .expectOne(r => r.urlWithParams.startsWith('/api/inventory/search'))
            .flush({ isFailed: false, data: { total: 0, items: [] } });

        expect(deliveries).toBe(3);
    });

    it('retains only the five most recent unique queries within the TTL', () => {
        const base: InventorySearchQuery = {
            criteria: 'Q',
            by: 'PartNumber',
            branches: [],
            onlyAvailable: false,
            page: 0,
            size: 5,
        };

        const makeQuery = (suffix: string): InventorySearchQuery => ({ ...base, criteria: `${base.criteria}-${suffix}` });

        // Keep time constant within TTL so eviction is driven solely by capacity.
        spyOn(Date, 'now').and.returnValue(2_000_000);

        const queries = ['1', '2', '3', '4', '5'].map(makeQuery);
        let deliveries = 0;

        queries.forEach(q => {
            svc.search(q).pipe(take(1)).subscribe(() => deliveries++);
            http
                .expectOne(r => r.url.startsWith('/api/inventory/search'))
                .flush({ isFailed: false, data: { total: 0, items: [] } });
        });

        // Sixth distinct query should evict the oldest ("1") while keeping the most recent five.
        const q6 = makeQuery('6');
        svc.search(q6).pipe(take(1)).subscribe(() => deliveries++);
        http
            .expectOne(r => r.url.startsWith('/api/inventory/search'))
            .flush({ isFailed: false, data: { total: 0, items: [] } });

        // Reissuing the first query should trigger a new HTTP call because it was evicted.
        svc.search(makeQuery('1')).pipe(take(1)).subscribe(() => deliveries++);
        http
            .expectOne(r => r.url.startsWith('/api/inventory/search'))
            .flush({ isFailed: false, data: { total: 0, items: [] } });

        expect(deliveries).toBe(7);
    });

});