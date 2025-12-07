# Inventory Search Code Test

This repository implements the Inventory Search exercise from InventorySearch-Instructions.pdf using an Angular 18 frontend and a .NET 8 backend. It covers the main requirements: reactive form with validation, cancel on new search behavior, loading and error states, sortable and paginated results, expandable rows, and caching of the five most recent unique searches for 60 seconds.

- Deliverables:
  - Buildable Angular feature
  - C# backend with service layer
  - Quick start instructions

## Getting started

### Prerequisites

- .NET 8 SDK
- Node and npm

### Backend (.NET 8)

In a terminal:

- cd InventoryServer/InventoryServer/InventoryServer
- dotnet restore
- dotnet run

By default the API exposes:

- GET /api/inventory/search
- GET /api/inventory/availability/peak
- GET /api/inventory/health

The console output shows the port the API is listening on (defaults to 3001).

### Frontend (Angular 18)

In another terminal:

- cd Inventory-Search
- npm install
- npm start

Make sure INVENTORY_API_BASE in src/app/app.module.ts points to the running .NET API. By default the app points at http://localhost:3001/api; if you change the backend port, update INVENTORY_API_BASE accordingly.

## Testing

- Angular tests  
  - cd Inventory-Search  
  - npm test
- All Angular tests targeting the acceptance criteria are in place and passing.

## Implementation details

### Frontend

The Angular feature lives under src/app/inventory-search-code-test and includes:

- Branch multi-select overhaul
  - Supports multiple branch tags, toggling, and removal
  - Defaults to all branches when none selected to allow “search all”
  - Closes on outside click and respects disabled state

- Search UX upgrades 
  - Initial search on page load with empty criteria/part-number and all branches
  - Debounce-driven submissions with cancel+info toast for superseded searches
  - Loading indicator tied to in-flight requests
 
- Results table enhancements
  - Sticky headers and responsive layout
  - Expandable rows showing lots and peak availability
  - Range-based “Showing X–Y of Z” summary driven by page index/size
  - Pagination controls wired to page index and total.

- Caching & API efficiency
  - Client-side search cache with 60s TTL and max 5 entries to avoid duplicate calls
  - Identical queries reuse shared replayed responses
  - Cancellation of prior HTTP calls on new searches reduces API workload if spammed.
  - Per-row caching and expansion toggle

- An RxJS based search pipeline that:
  - Debounces user input
  - Cancels previous requests when a new search starts
  - Manages loading and error state with a BehaviorSubject
  - Caches the five most recent unique search queries for 60 seconds

If API fields or response envelopes change, the Angular models and services should be updated together with the .NET models and services so the client and server stay in sync.

### Backend

The backend mirrors the expected API shape:

- InventoryController
  - Validates input
  - Enforces allowed search and sort fields
  - Returns consistent envelopes for the Angular client
  - Injects a small artificial latency to better exercise loading states

- InventoryService
  - Applies filtering, sorting, and paging rules
  - Calculates peak availability for each item

- MockInventoryRepository
  - Generates randomized but consistent inventory data
  - Ensures there are enough records to exercise multi page and edge cases
- A small 100 ms artificial delay is injected (ResponseDelayMilliseconds) to exercise cancel-on-new-search.

## Design choices

### Angular specific choices

- Branch multi select (custom ControlValueAccessor)  
  Instead of a basic select element I built a reusable multi select so I could control the UX and styling. It makes multi branch filtering obvious, keeps the form strongly typed, and shows that custom controls integrate cleanly with Angular forms.

- Caching peak lookups  
  The requirement covered caching the last five distinct searches for 60 seconds. I extended the same idea to peak availability lookups so repeated expansions within the time to live do not refetch the same data. This keeps the client responsive while also avoiding unnecessary traffic to the API; it was originally added thinking it was part of the acceptance criteria.

- Debounced and cancelable pipeline  
  Cancel on new search was required. My original implementation focused around disabling the search functionality while a search was in flight, I paired that requirement with debounce and guarded loading states to avoid giving users the ability to overwhelm the API. I ended up applying the in-flight cancellation but kept the debounce. The RxJS pipeline uses subjects, debounceTime, switchMap, takeUntil, and shareReplay to keep the code readable and testable. Coming from React with no prior Angular, I leaned on docs and ChatGPT to land this pattern; I wasn't aware of a simpler approach at the time.

- Component scoped styling  
  Styling is local to each component instead of global stylesheets. This helps prevent visual regressions, keeps the CSS easier to reason about, and reflects how I would structure styles in a larger application. For a time boxed exercise I focused more on data flow, typing, and UX behavior than on pixel perfect polish, and used chatgpt with guided, small/clear goals to save time/energy.

## Resources and tools

- Angular documentation  
  HttpClient usage patterns, Reactive Forms, and ControlValueAccessor for the branch multi select.

- RxJS documentation  
  Operators such as switchMap, debounceTime, takeUntil, and shareReplay for the debounced and cancelable search pipeline.

- .NET documentation  
  ASP.NET Core 8 minimal hosting model, options binding, and Swagger setup with Swashbuckle.

- ChatGPT and similar tools  
  - Used as a coding assistant to speed up learning Angular specific patterns, compare alternative approaches for the RxJS search pipeline and client side caching, and act as a rubber duck for debugging and design checks. The final implementation and refactoring decisions are my own.
  - Used to generate various things with basic goals to save time such as css and tests targetting acceptance criteria functionalities.

## Reviewer notes

- Stretch areas: branch multi select + its features like ControlValueAccessor, RxJS-heavy search orchestration, and client-side TTL caching were intentional stretch goals undertaken with no prior Angular experience; implemented with help from Angular/RxJS docs and ChatGPT.
- Latency: A 100 ms delay is kept to exercise cancel-on-new-search, the variable can be modified to test features like in-flight search cancellation.
- Testing: Angular tests for acceptance behaviors are present and passing.
