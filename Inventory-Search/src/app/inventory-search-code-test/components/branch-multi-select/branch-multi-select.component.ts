import {
    Component,
    Input,
    forwardRef,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    ElementRef,
    HostListener,
} from '@angular/core';
import {
    ControlValueAccessor,
    NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { SimpleChanges, OnChanges } from '@angular/core';

interface BranchOption {
    value: string;
    label: string;
}

@Component({
    selector: 'branch-multi-select',
    templateUrl: './branch-multi-select.component.html',
    styleUrls: ['./branch-multi-select.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => BranchMultiSelectComponent),
            multi: true,
        },
    ],
})

    // todo? pass branchoptions[] array to constructor, after requesting availabilty from the api. Use this to define the options variable.
    //  Not sure many use-cases would really demand this much adaptation to varying branch providers.
export class BranchMultiSelectComponent implements ControlValueAccessor, OnChanges {
    @Input() placeholder = 'Select branches';
    @Input() options: BranchOption[] = [
        { value: 'CLT', label: 'CLT' }, 
        { value: 'DEN', label: 'DEN' },
        { value: 'SLC', label: 'SLC' },
        { value: 'SEA', label: 'SEA' },
        { value: 'STL', label: 'STL' },
        { value: 'LAX', label: 'LAX' },
    ];

    isOpen = false;
    disabled = false;

    selectedSet = new Set<string>();

    private readonly maxCollapsedTags = 2;

    private onChange: (val: string[]) => void = () => { };
    private onTouched: () => void = () => { };

    constructor(
        private readonly cdr: ChangeDetectorRef,
        private readonly host: ElementRef<HTMLElement>
    ) { }

    requestAvailability(): void {

        //petform get request to the availability endpoint

        //assign returned branch values to the options variable
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['options']) {
            this.writeValue(Array.from(this.selectedSet));
        }
    }

    writeValue(value: string[] | null): void {
        this.selectedSet = this.toSet(value);
        this.cdr.markForCheck();
    }

    registerOnChange(fn: (val: string[]) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
        if (isDisabled) {
            this.isOpen = false;
        }
        this.cdr.markForCheck();
    }

    get selectedOptions(): BranchOption[] {
        //when no providers are selected, treat it like a "search all"
        var selected = this.options.filter(o => this.selectedSet.has(o.value));
        if (selected.length == 0)
            return this.options
        return selected
    }

    get visibleSelectedOptions(): BranchOption[] {
        if (this.isOpen) {
            return this.selectedOptions;
        }
        return this.selectedOptions.slice(0, this.maxCollapsedTags);
    }

    get hasHiddenSelectedOptions(): boolean {
        return !this.isOpen && this.selectedOptions.length > this.maxCollapsedTags;
    }

    get hiddenSelectedCount(): number {
        return Math.max(this.selectedOptions.length - this.maxCollapsedTags, 0);
    }

    togglePanel(): void {
        if (this.disabled) {
            return;
        }
        this.isOpen = !this.isOpen;
        this.onTouched();
        this.cdr.markForCheck();
    }

    toggleBranch(option: BranchOption): void {
        if (this.disabled) return;

        if (this.selectedSet.has(option.value)) {
            this.selectedSet.delete(option.value);
        } else {
            this.selectedSet.add(option.value);
        }

        const next = Array.from(this.selectedSet);
        this.onChange(next);
        this.onTouched();
        this.cdr.markForCheck();
    }

    removeBranch(option: BranchOption, event?: MouseEvent): void {
        if (event) {
            event.stopPropagation();
        }
        if (this.disabled) {
            return;
        }
        this.selectedSet.delete(option.value);
        const next = Array.from(this.selectedSet);
        this.onChange(next);
        this.onTouched();
        this.cdr.markForCheck();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.isOpen || this.disabled) {
            return;
        }

        const target = event.target as HTMLElement | null;
        if (target && !this.host.nativeElement.contains(target)) {
            this.isOpen = false;
            this.cdr.markForCheck();
        }
    }

    private toSet(values: string[] | null | undefined): Set<string> {
        const allowed = new Set(this.options.map(o => o.value));
        const set = new Set<string>();
        for (const v of values ?? []) {
            if (allowed.has(v)) {
                set.add(v);
            }
        }
        return set;
    }
}
