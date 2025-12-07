
using InventoryServer.Models;
using InventoryServer.Repositories;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace InventoryServer.Services
{

    public class InventoryService : IInventoryService
    {
        private readonly IInventoryRepository _repository;
        private readonly IConfiguration _configuration;

        public InventoryService(IInventoryRepository repository, IConfiguration configuration)
        {
            _repository = repository;
            _configuration = configuration;
        }

        public async Task<SearchResult> SearchInventoryAsync(InventorySearchRequest request)
        {
            var result = new SearchResult { Total = 0, Items = new List<InventoryItem>() };

            if (request == null)
                return result;
            
            var items = await _repository.GetAllItemsAsync();
            var workingItems = items ?? new List<InventoryItem>();
            var sortParts = request.Sort?.Split(':', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>();
            var sortField = sortParts.Length > 0 ? sortParts[0].Trim() : string.Empty;
            var sortDirection = sortParts.Length > 1 ? sortParts[1].Trim() : "asc";

            if (!string.IsNullOrWhiteSpace(request.Criteria))
            {
                var criteria = request.Criteria.ToLowerInvariant();
                workingItems = request.By switch
                {
                    "Description" => workingItems.Where(i => (i.Description ?? string.Empty).ToLowerInvariant().Contains(criteria)).ToList(),
                    "SupplierSku" => workingItems.Where(i => (i.SupplierSku ?? string.Empty).ToLowerInvariant().Contains(criteria)).ToList(),
                    _ => workingItems.Where(i => (i.PartNumber ?? string.Empty).ToLowerInvariant().Contains(criteria)).ToList(),
                };
            }

            if (!string.IsNullOrWhiteSpace(request.Branches))
            {
                var branchSet = request.Branches.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(b => b.Trim().ToLowerInvariant())
                    .ToHashSet();
                workingItems = workingItems.Where(i => branchSet.Contains((i.Branch ?? string.Empty).ToLowerInvariant())).ToList();
            }

            if (request.OnlyAvailable)
                workingItems = workingItems.Where(i => i.AvailableQty > 0).ToList();
            
            if (!string.IsNullOrWhiteSpace(sortField))
            {
                var isDescending = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);

                workingItems = sortField.ToLowerInvariant() switch
                {
                    "availableqty" => isDescending
                        ? workingItems.OrderByDescending(i => i.AvailableQty).ToList()
                        : workingItems.OrderBy(i => i.AvailableQty).ToList(),
                    "description" => isDescending
                        ? workingItems.OrderByDescending(i => i.Description).ToList()
                        : workingItems.OrderBy(i => i.Description).ToList(),
                    "branch" => isDescending
                        ? workingItems.OrderByDescending(i => i.Branch).ToList()
                        : workingItems.OrderBy(i => i.Branch).ToList(),
                    "uom" => isDescending
                        ? workingItems.OrderByDescending(i => i.Uom).ToList()
                        : workingItems.OrderBy(i => i.Uom).ToList(),
                    "leadtimedays" => isDescending
                        ? workingItems
                            .OrderBy(i => i.LeadTimeDays.HasValue ? 0 : 1)
                            .ThenByDescending(i => i.LeadTimeDays ?? int.MinValue)
                            .ToList()
                        : workingItems
                            .OrderBy(i => i.LeadTimeDays.HasValue ? 0 : 1)
                            .ThenBy(i => i.LeadTimeDays ?? int.MaxValue)
                            .ToList(),
                    "lastpurchasedate" => isDescending
                        ? workingItems
                            .OrderBy(i => i.LastPurchaseDate.HasValue ? 0 : 1)
                            .ThenByDescending(i => i.LastPurchaseDate ?? DateTime.MinValue)
                            .ToList()
                        : workingItems
                            .OrderBy(i => i.LastPurchaseDate.HasValue ? 0 : 1)
                            .ThenBy(i => i.LastPurchaseDate ?? DateTime.MaxValue)
                            .ToList(),
                    _ => isDescending
                        ? workingItems.OrderByDescending(i => i.PartNumber).ToList()
                        : workingItems.OrderBy(i => i.PartNumber).ToList(),
                };
            }

            result.Total = workingItems.Count;

            var safePage = request.Page < 0 ? 0 : request.Page;
            var safeSize = request.Size <= 0 ? 20 : request.Size;

            result.Items = workingItems
                .Skip(safePage * safeSize)
                .Take(safeSize)
                .ToList();

            return result;
        }

        public async Task<AvailabilityResult> GetPeakAvailabilityAsync(string partNumber)
        {
            var availability = new AvailabilityResult
            {
                PartNumber = partNumber,
                TotalAvailable = 0,
                Branches = new List<BranchAvailability>()
            };

            if (string.IsNullOrWhiteSpace(partNumber))
                return availability;
            
            var items = await _repository.FindByPartNumberAsync(partNumber);

            var grouped = items?
                .GroupBy(i => i.Branch ?? string.Empty)
                .Select(g => new BranchAvailability
                {
                    Branch = g.Key,
                    Qty = g.Sum(i => i.AvailableQty)
                })
                .ToList() ?? new List<BranchAvailability>();

            availability.Branches = grouped;
            availability.TotalAvailable = grouped.Sum(b => b.Qty);

            return availability;
        }
    }
}

