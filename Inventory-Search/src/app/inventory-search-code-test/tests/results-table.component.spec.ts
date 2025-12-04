import { of, throwError } from 'rxjs';
import { ResultsTableComponent } from '../components/results-table/results-table.component';
import { InventoryItem, PeakAvailability } from '../models/inventory-search.models';

const baseItem: InventoryItem = {
    partNumber: 'ABC123',
    supplierSku: 'SKU-1',
    description: 'Widget',
    branch: 'HQ',
    availableQty: 5,
    uom: 'EA',
    leadTimeDays: 1,
    lastPurchaseDate: '2024-01-01',
    lots: [],
};

describe('ResultsTableComponent', () => {
    let api: { getPeakAvailability: jasmine.Spy };
    let cdr: { markForCheck: jasmine.Spy };
    let toast: { error: jasmine.Spy; success: jasmine.Spy };
    let component: ResultsTableComponent;

    beforeEach(() => {
        api = { getPeakAvailability: jasmine.createSpy('getPeakAvailability') };
        cdr = { markForCheck: jasmine.createSpy('markForCheck') };
        toast = { error: jasmine.createSpy('error'), success: jasmine.createSpy('success') };
        component = new ResultsTableComponent(api as any, cdr as any, toast as any);
    });

    it('emits sort events when headers clicked', () => {
        const sortSpy = spyOn(component.sort, 'emit');
        component.onHeaderClick('partNumber');
        expect(sortSpy).toHaveBeenCalledWith('partNumber');
    });

    it('emits page changes and clamps bounds', () => {
        const pageSpy = spyOn(component.pageChange, 'emit');
        component.total = 30;
        component.pageSize = 10;

        component.goTo(2);
        expect(pageSpy).toHaveBeenCalledWith(2);

        pageSpy.calls.reset();
        component.pageIndex = 2;
        component.goTo(5);
        expect(pageSpy).not.toHaveBeenCalled();
    });

    it('expands rows and tracks keys', () => {
        const key = component.itemKey(baseItem);
        expect(key).toBe('ABC123|HQ');
        component.toggleExpand(baseItem);
        expect(component.expanded[key]).toBeTrue();
    });

    it('loads peak availability and marks view for check', () => {
        const peak: PeakAvailability = {
            partNumber: 'ABC123',
            totalAvailable: 10,
            branches: [{ branch: 'HQ', qty: 10 }],
        };
        api.getPeakAvailability.and.returnValue(of({ isFailed: false, data: peak }));

        component.fetchPeakAvailability(baseItem);

        const key = component.itemKey(baseItem);
        expect(component.peakFor(baseItem)).toEqual(peak);
        expect(component.errorMessage).toBeNull();
        expect(cdr.markForCheck).toHaveBeenCalled();
    });

    it('handles peak availability errors and surfaces toast', () => {
        api.getPeakAvailability.and.returnValue(throwError(() => new Error('boom')));

        component.fetchPeakAvailability(baseItem);

        const key = component.itemKey(baseItem);
        expect(component.peakByPart[key]).toBeNull();
        expect(component.errorMessage).toBe('boom');
        expect(toast.error).toHaveBeenCalledWith('boom');
        expect(cdr.markForCheck).toHaveBeenCalled();
    });
});
