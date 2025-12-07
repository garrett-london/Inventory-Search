using InventoryServer.Models;

// {done} TODO Implement the required code
/*
You are free to determine how you want to create data to be returned 
Feel free to modify and/or expand the Interface as needed 
Must have at least enough data to demonstrate paging (4 or more pages)
*/
namespace InventoryServer.Repositories
{
    public class MockInventoryRepository : IInventoryRepository
    {
        // Data pools for randomized data generation
        private readonly string[] _branchPool = ["CLT", "DEN", "SLC", "SEA", "STL", "LAX"];
        private readonly string[] _partNumberPrefixPool = ["AI", "DB", "VM", "CI", "CD"];
        private readonly string[] _skuPrefixPool = ["ORM", "SDK", "API", "GUI", "AWS"];
        private readonly string[] _descriptionAdvPool = ["silently", "iteratively", "swiftly", "lazily", "rustily", "virtually", "scalably", "optimistically", "asyncly", "recursively"];
        private readonly string[] _descriptionAdjPool = ["recursive", "deprecated", "scalable", "mutable", "asynchronous", "out-of-support", "dynamic", "overengineered", "buggy", "misconfigured"];
        private readonly string[] _descriptionNounPool = ["runtime", "interface", "program", "container", "algorithm", "cache", "syntax", "endpoint", "stacktrace", "operation"];
        private readonly string[] _uomPool = ["GB", "TB", "MB", "KB", "PB"];

        // Constants
        private readonly int _availableValueMax = 500;
        private readonly int _availableValueMin = 0; 
        private readonly int _partNumberValueMax = 10000; 
        private readonly int _partNumberValueMin = 1000; 
        private readonly int _skuValueMax = 99995; 
        private readonly int _skuValueMin = 10005; 
        private readonly int _leadTimeValueMax = 35; 
        private readonly int _leadTimeValueMin = 1; 
        private readonly int _lotValueMax = 100000; 
        private readonly int _lotValueMin = 1;
        private readonly int _inventoryCountMax = 1000;
        private readonly int _inventoryCountMin = 50;
        private readonly int _lastPurchaseRange = 6; 

        private readonly double _chanceOfLP = 0.85;
        private readonly double _chanceOfLT = 0.85;
        private readonly double _chanceOfLot = 0.3;

        //Utils
        private readonly Random _random = new Random();
        private readonly List<InventoryItem> _items = new List<InventoryItem>();
        private readonly HashSet<string> _generatedPartNumbers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        private readonly HashSet<string> _generatedSupplierSkus = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        private readonly HashSet<string> _generatedDescriptions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        


        public MockInventoryRepository()
        {
            // Initialize the collection with enough items to exercise paging scenarios (4+ pages at default size).
            InventoryItem GenerateItem()
            {
                var lots = NextLots();
                return new InventoryItem
                {
                    PartNumber = NextUniquePartNumber(),
                    SupplierSku = NextUniqueSupplierSku(),
                    Description = NextUniqueDescription(),
                    Branch = NextBranch(),
                    Uom = NextUom(),
                    LeadTimeDays = NextLeadTimeDays(),
                    LastPurchaseDate = NextLastPurchaseDate(),
                    Lots = lots,
                    AvailableQty = NextAvailableQty(lots)
                };
            }

            var numItems = _random.Next(this._inventoryCountMin, this._inventoryCountMax);

            for (var i = 1; i <= numItems; i++)
            {
                _items.Add(GenerateItem());
            }
        }

        public Task<List<InventoryItem>> GetAllItemsAsync()
        {
            var items = _items.ToList();
            return Task.FromResult(items);
        }

        public Task<List<InventoryItem>> FindByPartNumberAsync(string partNumber)
        {
            if (string.IsNullOrWhiteSpace(partNumber))
                return Task.FromResult(new List<InventoryItem>());
            
            var matches = _items
                .Where(i => string.Equals(i.PartNumber, partNumber, StringComparison.OrdinalIgnoreCase))
                .ToList();

            return Task.FromResult(matches);
        }

        public Task<List<InventoryItem>> QueryAsync(InventorySearchRequest request)
        {
            if (request == null)
                return Task.FromResult(_items.ToList());
            var workingItems = _items.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(request.Criteria))
            {
                var criteria = request.Criteria.ToLowerInvariant();
                workingItems = request.By switch
                {
                    "Description" => workingItems.Where(i => (i.Description ?? string.Empty).ToLowerInvariant().Contains(criteria)),
                    "SupplierSku" => workingItems.Where(i => (i.SupplierSku ?? string.Empty).ToLowerInvariant().Contains(criteria)),
                    _ => workingItems.Where(i => (i.PartNumber ?? string.Empty).ToLowerInvariant().Contains(criteria)),
                };
            }

            if (!string.IsNullOrWhiteSpace(request.Branches))
            {
                var branchSet = request.Branches.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(b => b.Trim().ToLowerInvariant())
                    .ToHashSet();
                workingItems = workingItems.Where(i => branchSet.Contains((i.Branch ?? string.Empty).ToLowerInvariant()));
            }

            if (request.OnlyAvailable)
                workingItems = workingItems.Where(i => i.AvailableQty > 0);
            

            return Task.FromResult(workingItems.ToList());
        }

        private string NextFromPool(string[] pool)
        {
            if (pool == null || pool.Length == 0)
                return string.Empty;
            
            var index = _random.Next(0, pool.Length);
            return pool[index];
        }

        private string NextBranch() => NextFromPool(_branchPool);

        private string NextPartNumber() {
            var prefix = NextFromPool(this._partNumberPrefixPool);

            var partNum = _random.Next(this._partNumberValueMin, this._partNumberValueMax);
            partNum += 5 - (partNum % 5);

            return prefix + partNum.ToString("0000");
        }

        private string NextSupplierSku()
        {
            var prefix = NextFromPool(this._skuPrefixPool);

            var skuNum = _random.Next(this._skuValueMin, this._skuValueMax);
            skuNum += 5 - (skuNum % 5);

            return prefix + skuNum.ToString("00000");
        }
        
        private string NextDescription()
        {
            var adverb = _descriptionAdvPool[_random.Next(_descriptionAdvPool.Length)];
            var adjective = _descriptionAdjPool[_random.Next(_descriptionAdjPool.Length)];
            var noun = _descriptionNounPool[_random.Next(_descriptionNounPool.Length)];

            return $"{adverb} {adjective} {noun}";
        }

        private string NextUom() => NextFromPool(_uomPool);

        private string NextUniquePartNumber()
        {
            return GenerateUniqueValue(NextPartNumber, _generatedPartNumbers, "PN");
        }

        private string NextUniqueSupplierSku()
        {
            return GenerateUniqueValue(NextSupplierSku, _generatedSupplierSkus, "SKU");
        }

        private string NextUniqueDescription()
        {
            return GenerateUniqueValue(NextDescription, _generatedDescriptions, "DESC");
        }

        private string GenerateUniqueValue(Func<string> generator, HashSet<string> tracker, string fallbackPrefix)
        {
            const int maxAttempts = 50;
            for (var attempt = 0; attempt < maxAttempts; attempt++)
            {
                var candidate = generator();
                if (tracker.Add(candidate))
                {
                    return candidate;
                }
            }

            var fallback = $"{fallbackPrefix}-{tracker.Count + 1}";
            tracker.Add(fallback);
            return fallback;
        }

        private int NextAvailableQty(List<LotInfo> lots)
        {
            // Sample between 0 and 50 units to simulate varied availability.
            //if(lots  == null || lots.Count == 0)
            //    return _random.Next(0, 500);

            //var total = 0;
            //foreach (var lot in lots)
            //    total += lot.Qty;

            //return total;
            return lots?.Sum(l => l.Qty) ?? _random.Next(this._availableValueMin, this._availableValueMax);
        }

        private int? NextLeadTimeDays()
        {
            var hasLeadTime = _random.NextDouble() < this._chanceOfLT;
            if (!hasLeadTime)
                return null;
            var leadTime = _random.Next(this._leadTimeValueMin, this._leadTimeValueMax);
            return leadTime;
        }

        private DateTime? NextLastPurchaseDate()
        {
            //FORMATTED AS AN ISO 8601 timestamp
            var hasDate = _random.NextDouble() < this._chanceOfLP;
            if (!hasDate)
                return null;

            var max = DateTime.UtcNow.AddMonths(-this._lastPurchaseRange);
            var range = DateTime.UtcNow - max;
            var randomOffset = new TimeSpan((long)(_random.NextDouble() * range.Ticks));

            var randomDate = max + randomOffset;
            return randomDate;
            
        }

        private LotInfo NextLot()
        {
            
            var leadTime = _random.Next(this._lotValueMin, this._lotValueMax);
            
            var lot = new LotInfo
            {
                LotNumber = "LOT-" + leadTime.ToString("00000"),
                Qty = _random.Next(1,100),
                ExpirationDate = _random.NextDouble() >= 0.5
                    ? DateTime.UtcNow.AddDays(_random.Next(30, 365))
                    : (DateTime?)null
            };

            return lot;
        }

        private List<LotInfo> NextLots()
        {
            var lots = new List<LotInfo>();
            var hasLot = _random.NextDouble() < this._chanceOfLot;
            while (hasLot)
            {
                lots.Add(NextLot());
                hasLot = _random.NextDouble() < this._chanceOfLot;
            }

            return lots;
        }

    }
}
