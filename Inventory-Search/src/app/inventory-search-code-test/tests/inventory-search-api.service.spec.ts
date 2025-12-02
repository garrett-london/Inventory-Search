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

    const req1 = http.expectOne(r => r.method === 'GET' && r.url === '/api/inventory/search');
    req1.flush({ isFailed: false, data: { total: 0, items: [] } });

    // 2nd call with same query should not fire a new HTTP request (served from cache)
    const sub2 = svc.search(q).pipe(take(1)).subscribe(() => {
      calls++;
    });
    http.expectNone('/api/inventory/search');

    sub1.unsubscribe();
    sub2.unsubscribe();

    expect(calls).toBe(2);

  });
});
