import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { IndexPageComponent } from './pages/index-page/index-page.component';
import { ResultsTableComponent } from './components/results-table/results-table.component';
import { BranchMultiSelectComponent } from './components/branch-multi-select/branch-multi-select.component';
import { INVENTORY_API_BASE } from './services/inventory-search-api.service';

@NgModule({
    declarations: [IndexPageComponent, ResultsTableComponent, BranchMultiSelectComponent],
    imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
    exports: [IndexPageComponent],
    providers: [{ provide: INVENTORY_API_BASE, useValue: '/api' }]
})
export class InventorySearchCodeTestModule { }
