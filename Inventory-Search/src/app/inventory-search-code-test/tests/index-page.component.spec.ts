//tests/index-page.component.spec.ts
// TypeScript
import {ComponentFixture, TestBed, fakeAsync, tick, flush} from '@angular/core/testing';
import {IndexPageComponent} from '../pages/index-page/index-page.component';
import {INVENTORY_API_BASE, InventorySearchApiService} from '../services/inventory-search-api.service';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import { Subject } from 'rxjs';
import { INVENTORY_SEARCH_DEBOUNCE_MS } from '../pages/index-page/index-page.component';

describe('IndexPageComponent', () => {
  let fixture: ComponentFixture<IndexPageComponent>;


  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IndexPageComponent],
      imports: [ReactiveFormsModule, HttpClientTestingModule],
      providers: [
        { provide: INVENTORY_API_BASE, useValue: '/api' },
        InventorySearchApiService,
        // Disable debounce for deterministic tests
        { provide: INVENTORY_SEARCH_DEBOUNCE_MS, useValue: 0 }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(IndexPageComponent);
    fixture.detectChanges();
  });

  it('disables Search when form invalid', () => {
    const comp = fixture.componentInstance;
    comp.form.patchValue({ criteria: '' });
    expect(comp.form.invalid).toBeTrue();
  });

  it('toggles loading around search', fakeAsync(() => {
    const comp = fixture.componentInstance;
    const api = TestBed.inject(InventorySearchApiService);

    const response$ = new Subject<any>();
    spyOn(api, 'search').and.returnValue(response$.asObservable());

    comp.form.patchValue({
      criteria: 'ABC',
      by: 'PartNumber',
      branches: ['SEA'],
      onlyAvailable: false
    });
    comp.form.updateValueAndValidity();
    expect(comp.form.valid).toBeTrue();

    // Call directly to avoid relying on template events
    comp.onSearch();

    // Allow any debounce/microtasks timers used inside onSearch to run
    tick(0);

    // Ensure the API was called (spy also asserted loading=true at call time)
    expect(api.search).toHaveBeenCalled();
    expect(comp.loading$.value).toBeTrue();

    // Resolve the "request"
    response$.next({ isFailed: false, data: { total: 0, items: [] } });
    response$.complete();

    // Allow completion handlers to run (e.g., finalize)
    tick(0);

    expect(comp.loading$.value).toBeFalse();
  }));
});
