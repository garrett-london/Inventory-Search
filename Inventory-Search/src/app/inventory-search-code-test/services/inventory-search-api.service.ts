
//services/inventory-search-api.service.ts

// TypeScript
import {HttpClient, HttpParams} from '@angular/common/http';
import {Inject, Injectable, InjectionToken} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {catchError, shareReplay} from 'rxjs/operators';
import {
  ApiEnvelope,
  InventorySearchQuery,
  PagedInventoryResponse,
  PeakAvailability,
} from '../models/inventory-search.models';

export const INVENTORY_API_BASE = new InjectionToken<string>('INVENTORY_API_BASE');

// TTL 60s, keep up to 5 cached queries
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 5;

interface CacheEntry<T> {
  key: string;
  expiry: number;
  obs$: Observable<T>;
}

@Injectable({ providedIn: 'root' })
export class InventorySearchApiService {
  private cache: CacheEntry<ApiEnvelope<PagedInventoryResponse>>[] = [];
  private peakCache: CacheEntry<ApiEnvelope<PeakAvailability>>[] = [];

  constructor(
    private readonly http: HttpClient,
    @Inject(INVENTORY_API_BASE) private readonly baseUrl: string
  ) {}

  search(query: InventorySearchQuery): Observable<ApiEnvelope<PagedInventoryResponse>> {
      const now = Date.now();
      // Keep a small in-memory cache with expiration; reuse in-flight/completed observables.
      this.cache = this.cache.filter((entry) => entry.expiry > now);
      // Derive a stable cache key from the query (include all fields that affect results).
      const key = this.cacheKey(query);
      const hit = this.cache.find((entry) => entry.key === key);
      if (hit) {
          return hit.obs$;
      }

      // Translate the query into HTTP params; include optional fields only when present.
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
          params = params.set('sort', `${query.sort.field},${query.sort.direction}`);
      }

      // Avoid mixing UI concerns; this layer should only compose and return data streams.
      const obs$ = this.http
          .get<ApiEnvelope<PagedInventoryResponse>>(`${this.baseUrl}/inventory/search`, { params })
          .pipe(
              // Return a shared observable so multiple subscribers don't duplicate requests.
              shareReplay({ bufferSize: 1, refCount: false }),
              catchError((err) => {
                  this.evict(this.cache, key);
                  return throwError(() => err);
              })
          );

      this.remember(this.cache, { key, obs$ });
      return obs$;
  }

  getPeakAvailability(partNumber: string): Observable<ApiEnvelope<PeakAvailability>> {
      const now = Date.now();
      // Use the part number to form a cache key for this lookup.
      // Evict stale entries before attempting a cache hit.
      this.peakCache = this.peakCache.filter((entry) => entry.expiry > now);
      const key = `peak:${partNumber}`;
      const hit = this.peakCache.find((entry) => entry.key === key);
      if (hit) {
          return hit.obs$;
      }

      // Otherwise, issue a GET with the partNumber as a query param and share the result.
      const params = new HttpParams().set('partNumber', partNumber);
      const obs$ = this.http
          .get<ApiEnvelope<PeakAvailability>>(`${this.baseUrl}/inventory/availability/peak`, { params })
          .pipe(
              // Return a shared observable so multiple subscribers don't duplicate requests.
              shareReplay({ bufferSize: 1, refCount: false }),
              catchError((err) => {
                  this.evict(this.peakCache, key);
                  return throwError(() => err);
              })
          );

      // Remember the observable with a TTL (time to live); keep this method free of UI concerns.
      this.remember(this.peakCache, { key, obs$ });
      return obs$;
  }

  private remember<T>(
    cache: CacheEntry<T>[],
    entry: { key: string; obs$: Observable<T> }
  ) {
      // Consider how expiration (TTL) interacts with capacity-based eviction.
      const now = Date.now();
      cache.push({ ...entry, expiry: now + CACHE_TTL_MS });
      // Keep the cache small and predictable; decide what to evict when full.
      if (cache.length > CACHE_MAX_ENTRIES) {
          cache.shift();
      }
      // Think about whether failed results should be cached the same way as successful ones.
      // Keep this purely about data/memoization; avoid UI/side-effects here.
  }

  private evict<T>(cache: CacheEntry<T>[], key: string) {
      const idx = cache.findIndex((entry) => entry.key === key);
      if (idx !== -1) {
          cache.splice(idx, 1);
      }
  }

  private cacheKey(q: InventorySearchQuery): string {
      // - Produce a stable key that uniquely represents the query.
      const branches = [...q.branches].sort().join('|');
      const sort = q.sort ? `${q.sort.field}:${q.sort.direction}` : '';
      // - Normalize values (e.g., trim, lowercase) to avoid duplicate keys for equivalent inputs.
      // - Ensure ordering doesn't affect the key (e.g., sort arrays like branches).
      // - Include every parameter that can change results; omit those that do not.
      // - Choose delimiters that won't collide with real data.
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
