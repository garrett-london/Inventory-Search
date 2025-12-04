import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BranchMultiSelectComponent } from '../components/branch-multi-select/branch-multi-select.component';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
    template: `
    <form [formGroup]="form">
      <branch-multi-select formControlName="branches"></branch-multi-select>
    </form>
  `
})
class HostComponent {
    form = new FormGroup({
        branches: new FormControl<string[] | null>([]),
    });
}

describe('BranchMultiSelectComponent', () => {
    let fixture: ComponentFixture<BranchMultiSelectComponent>;
    let component: BranchMultiSelectComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [BranchMultiSelectComponent, HostComponent],
            imports: [ReactiveFormsModule],
        }).compileComponents();

        fixture = TestBed.createComponent(BranchMultiSelectComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    const getControl = () => fixture.debugElement.query(By.css('.branch-select__control'));
    const getOptionButtons = () => fixture.debugElement.queryAll(By.css('.branch-select__option'));
    const click = (el: HTMLElement) => el.dispatchEvent(new Event('click'));

    it('opens the panel and renders options', () => {
        click(getControl().nativeElement);
        fixture.detectChanges();

        const opts = getOptionButtons().map(btn => btn.nativeElement.textContent.trim());
        expect(opts).toContain('SEA');
        expect(opts).toContain('PDX');
    });

    it('selects and removes branches, keeping ControlValueAccessor in sync', () => {
        click(getControl().nativeElement);
        fixture.detectChanges();

        const sea = getOptionButtons().find(btn => btn.nativeElement.textContent.includes('SEA'))!.nativeElement;
        click(sea);
        fixture.detectChanges();

        expect(component['selectedSet']).toEqual(new Set(['SEA']));

        const removeBtn = fixture.debugElement.query(By.css('.branch-tag__remove'));
        click(removeBtn.nativeElement);
        fixture.detectChanges();

        expect(component['selectedSet'].size).toBe(0);
    });

    it('respects disabled state and prevents toggling', () => {
        component.setDisabledState(true);
        fixture.detectChanges();

        click(getControl().nativeElement);
        fixture.detectChanges();

        expect(component['isOpen']).toBeFalse();
        expect(getOptionButtons().length).toBe(0);
    });

    it('cleans up selection when options change', () => {
        component.writeValue(['SEA', 'PDX']);
        fixture.detectChanges();

        component.options = [{ value: 'SEA', label: 'SEA' }];
        component.ngOnChanges({ options: { currentValue: component.options, previousValue: [], firstChange: false, isFirstChange: () => false } });
        fixture.detectChanges();

        expect(Array.from(component['selectedSet'])).toEqual(['SEA']);
    });

    describe('as a form control', () => {
        let hostFixture: ComponentFixture<HostComponent>;
        let hostComponent: HostComponent;

        beforeEach(() => {
            hostFixture = TestBed.createComponent(HostComponent);
            hostComponent = hostFixture.componentInstance;
            hostFixture.detectChanges();
        });

        const hostGetControl = () => hostFixture.debugElement.query(By.css('.branch-select__control'));
        const hostGetOptions = () => hostFixture.debugElement.queryAll(By.css('.branch-select__option'));
        const hostClick = (el: HTMLElement) => el.dispatchEvent(new Event('click'));

        it('supports multi-select and keeps array order of selection', () => {
            hostClick(hostGetControl().nativeElement);
            hostFixture.detectChanges();

            const den = hostGetOptions().find(btn => btn.nativeElement.textContent.includes('DEN'))!.nativeElement;
            hostClick(den);
            hostFixture.detectChanges();

            const sea = hostGetOptions().find(btn => btn.nativeElement.textContent.includes('SEA'))!.nativeElement;
            hostClick(sea);
            hostFixture.detectChanges();

            expect(hostComponent.form.value).toEqual({ branches: ['DEN', 'SEA'] });
        });

        it('preserves value when clicking empty control space', () => {
            hostClick(hostGetControl().nativeElement);
            hostFixture.detectChanges();

            const den = hostGetOptions().find(btn => btn.nativeElement.textContent.includes('DEN'))!.nativeElement;
            hostClick(den);
            hostFixture.detectChanges();

            hostClick(hostGetControl().nativeElement);
            hostFixture.detectChanges();

            expect(hostComponent.form.value).toEqual({ branches: ['DEN'] });
        });
    });
});
