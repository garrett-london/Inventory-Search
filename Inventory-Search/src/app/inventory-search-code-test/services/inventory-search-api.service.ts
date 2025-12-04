import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable, InjectionToken } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { ApiEnvelope, InventorySearchQuery, PagedInventoryResponse, PeakAvailability } from '../models/inventory-search.models';

export const INVENTORY_API_BASE = new InjectionToken<string>('INVENTORY_API_BASE');

const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 5;

@Injectable({ providedIn: 'root' })
export class InventorySearchApiService {
  private searchCache = new Map<string, { expiry: number; obs$: Observable<ApiEnvelope<PagedInventoryResponse>> }>();
  private peakCache = new Map<string, { expiry: number; obs$: Observable<ApiEnvelope<PeakAvailability>> }>();

  constructor(
    private readonly http: HttpClient,
    @Inject(INVENTORY_API_BASE) private readonly baseUrl: string
  ) {}

  search(query: InventorySearchQuery): Observable<ApiEnvelope<PagedInventoryResponse>> {
    const key = this.cacheKey(query);
    const cached = this.getCached(this.searchCache, key);
    if (cached) {
      return cached;
    }

    let params = new HttpParams()
      .set('criteria', query.criteria)
      .set('by', query.by)
      .set('page', query.page.toString())
      .set('size', query.size.toString());

    if (query.branches.length) {
      params = params.set('branches', query.branches.join(','));
    }
    if (query.onlyAvailable) {
      params = params.set('onlyAvailable', String(query.onlyAvailable));
    }
    if (query.sort) {
      params = params.set('sort', `${query.sort.field}:${query.sort.direction}`);
    }

    const obs$ = this.http
      .get<ApiEnvelope<PagedInventoryResponse>>(`${this.baseUrl}/inventory/search`, { params })
      .pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError((err) => {
          this.searchCache.delete(key);
          return throwError(() => err);
        })
      );

    this.remember(this.searchCache, key, obs$);
    return obs$;
  }

  getPeakAvailability(partNumber: string): Observable<ApiEnvelope<PeakAvailability>> {
    const key = `peak:${partNumber}`;
    const cached = this.getCached(this.peakCache, key);
    if (cached) {
      return cached;
    }

    const params = new HttpParams().set('partNumber', partNumber);
    const obs$ = this.http
      .get<ApiEnvelope<PeakAvailability>>(`${this.baseUrl}/inventory/availability/peak`, { params })
      .pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        catchError((err) => {
          this.peakCache.delete(key);
          return throwError(() => err);
        })
      );

    this.remember(this.peakCache, key, obs$);
    return obs$;
  }

  private getCached<T>(cache: Map<string, { expiry: number; obs$: Observable<T> }>, key: string) {
    const entry = cache.get(key);
    if (!entry || entry.expiry < Date.now()) {
      cache.delete(key);
      return undefined;
    }
    return entry.obs$;
  }

  private remember<T>(cache: Map<string, { expiry: number; obs$: Observable<T> }>, key: string, obs$: Observable<T>) {
    cache.set(key, { obs$, expiry: Date.now() + CACHE_TTL_MS });
    this.trim(cache);
  }

  private trim(cache: Map<string, unknown>) {
    while (cache.size > CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
  }

  private cacheKey(q: InventorySearchQuery): string {
    const branches = [...q.branches].sort().join('|');
    const sort = q.sort ? `${q.sort.field}:${q.sort.direction}` : '';
    return [
      q.criteria.trim().toLowerCase(),
      q.by,
      branches,
      q.onlyAvailable ? '1' : '0',
      q.page,
      q.size,
      sort,
    ].join('::');
  }
}
