This is a simple, zero-dependency mock API server you can run on Windows. 
It implements the endpoints to be used by the Inventory Search code test:
	GET /api/inventory/search
	GET /api/inventory/availability/peak
What you’ll get
	In memory dataset seeded at startup
	Filtering by criteria, by, branches, onlyAvailable
	Pagination and sorting
	Optional simulated latency and failure
	Peak availability summarization
Files to create
1.package.json
2.mock-server.js
3..env (optional


How to run on Windows
Prerequisites: Node.js LTS installed
Steps: 
	Create a new folder, e.g., C:\inventory-mock-api
	Save the three files above into that folder
	Open Command Prompt in that folder
	Run: 
		npm install
		npm start
		You should see: 
			Inventory mock API running on http://localhost:3001/api
	Verify: 
		Open a browser: 
			http://localhost:3001/api/health
		Sample search: 
			http://localhost:3001/api/inventory/search?criteria=AB-10&by=PartNumber&page=0&size=20&sort=availableQty:desc
		Peak availability: 
			http://localhost:3001/api/inventory/availability/peak?partNumber=AB-1001
Point your Angular feature to the mock
	In your Angular module where you provide the base URL: 
		useValue: 'http://localhost:3001/api'
Tuning behavior
	Simulate failure per request: append &fail=true to search URL
	Simulate random failures globally: set FAILURE_RATE in .env (e.g., 0.1)
	Change latency: SIMULATED_DELAY_MS in .env