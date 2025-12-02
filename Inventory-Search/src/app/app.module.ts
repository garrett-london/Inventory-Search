// TypeScript
import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {AppComponent} from './app.component';

// Import the code-test feature module
import {InventorySearchCodeTestModule} from './inventory-search-code-test/inventory-search.module';
import {INVENTORY_API_BASE} from './inventory-search-code-test/services/inventory-search-api.service';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    InventorySearchCodeTestModule
  ],
  providers: [
    // Point to your mock server or real API
    { provide: INVENTORY_API_BASE, useValue: 'http://localhost:3001/api' }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
