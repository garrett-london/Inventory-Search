using InventoryServer.Models;
using InventoryServer.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace InventoryServer.Controllers
{
    [Route("api/inventory")]
    [ApiController]
    public class InventoryController : ControllerBase
    {
        private const int ResponseDelayMilliseconds = 100;
        private const int MaxPageSize = 200;
        private static readonly HashSet<string> AllowedSearchByFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "PartNumber",
            "Description",
            "SupplierSku"
        };
        private static readonly HashSet<string> AllowedSortFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "",
            "partnumber",
            "description",
            "availableqty",
            "branch",
            "uom",
            "leadtimedays",
            "lastpurchasedate"
        };

        private readonly IInventoryService _inventoryService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<InventoryController> _logger;

        public InventoryController(IInventoryService inventoryService, IConfiguration configuration, ILogger<InventoryController> logger)
        {
            _inventoryService = inventoryService;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpGet("search")]
        public async Task<ActionResult<ResponseEnvelope<SearchResult>>> Search(
            [FromQuery] string criteria = "",
            [FromQuery] string by = "PartNumber",
            [FromQuery] string branches = "",
            [FromQuery] bool onlyAvailable = false,
            [FromQuery] int page = 0,
            [FromQuery] int size = 20,
            [FromQuery] string sort = "",
            [FromQuery] bool fail = false)
        {
            var envelope = ResponseEnvelope<SearchResult>.Success(new SearchResult
            {
                Total = 0,
                Items = new List<InventoryItem>()
            });

            var parsedSort = sort?.Split(':', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>();
            var sortField = parsedSort.Length > 0 ? parsedSort[0].Trim() : string.Empty;
            var sortDirection = parsedSort.Length > 1 ? parsedSort[1].Trim() : "asc";

            // Unsupported sortable fields should return a client error.
            if (!string.IsNullOrWhiteSpace(sortField) &&
                (string.Equals(sortField, "supplierSku", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(sortField, "lots", StringComparison.OrdinalIgnoreCase)))
            {
                _logger.LogWarning("Sort field {SortField} is not sortable.", sortField);
                return BadRequest(ResponseEnvelope<SearchResult>.Failure("supplierSku and lots are not sortable fields."));
            }

            if (fail)
            {
                _logger.LogWarning("Simulated failure requested for search.");
                return BadRequest(ResponseEnvelope<SearchResult>.Failure("Simulated failure requested."));
            }

            if (page < 0)
            {
                _logger.LogWarning("Invalid page value {Page} supplied.", page);
                return BadRequest(ResponseEnvelope<SearchResult>.Failure("Page must be zero or greater."));
            }

            if (size <= 0 || size > MaxPageSize)
            {
                _logger.LogWarning("Invalid size value {Size} supplied.", size);
                return BadRequest(ResponseEnvelope<SearchResult>.Failure($"Size must be between 1 and {MaxPageSize}."));
            }

            if (!AllowedSearchByFields.Contains(by ?? string.Empty))
            {
                _logger.LogWarning("Invalid search field {By} supplied.", by);
                return BadRequest(ResponseEnvelope<SearchResult>.Failure($"Search field must be one of: {string.Join(", ", AllowedSearchByFields)}."));
            }

            if (!AllowedSortFields.Contains(sortField.ToLowerInvariant()))
            {
                _logger.LogWarning("Invalid sort field {SortField} supplied.", sortField);
                return BadRequest(ResponseEnvelope<SearchResult>.Failure("Sort field is not supported."));
            }

            if (!string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Invalid sort direction {Direction} supplied.", sortDirection);
                return BadRequest(ResponseEnvelope<SearchResult>.Failure("Sort direction must be asc or desc."));
            }

            var request = new InventorySearchRequest
            {
                Criteria = criteria,
                By = by,
                Branches = branches,
                OnlyAvailable = onlyAvailable,
                Page = page,
                Size = size,
                Sort = string.IsNullOrWhiteSpace(sortField)
                    ? string.Empty
                    : $"{sortField}:{sortDirection}"
            };

            var result = await _inventoryService.SearchInventoryAsync(request);
            if (result == null || result.Total == 0)
            {
                _logger.LogInformation("No inventory found for criteria {@Request}.", request);
                return NotFound(ResponseEnvelope<SearchResult>.Failure("No inventory found for the provided criteria."));
            }

            envelope = ResponseEnvelope<SearchResult>.Success(result);
            await Task.Delay(ResponseDelayMilliseconds);
            return Ok(envelope);
        }

        [HttpGet("availability/peak")]
        public async Task<ActionResult<ResponseEnvelope<AvailabilityResult>>> GetPeakAvailability(
            [FromQuery] string partNumber)
        {
            var envelope = ResponseEnvelope<AvailabilityResult>.Success(new AvailabilityResult
            {
                PartNumber = partNumber,
                TotalAvailable = 0,
                Branches = new List<BranchAvailability>()
            });

            if (string.IsNullOrWhiteSpace(partNumber))
            {
                _logger.LogWarning("Missing part number for peak availability request.");
                return BadRequest(ResponseEnvelope<AvailabilityResult>.Failure("Part number is required."));
            }
            
            var availability = await _inventoryService.GetPeakAvailabilityAsync(partNumber);
            if (availability == null || availability.Branches == null || availability.Branches.Count == 0)
            {
                _logger.LogInformation("Part number {PartNumber} not found for availability.", partNumber);
                return NotFound(ResponseEnvelope<AvailabilityResult>.Failure("Part number not found."));
            }

            envelope = ResponseEnvelope<AvailabilityResult>.Success(availability);
            await Task.Delay(ResponseDelayMilliseconds);

            return Ok(envelope);
        }

        [HttpGet("health")]
        public async Task<ActionResult<object>> Health()
        {
            var health = new
            {
                status = "ok",
                timestamp = DateTimeOffset.UtcNow
            };

            await Task.CompletedTask;
            await Task.Delay(ResponseDelayMilliseconds);

            return Ok(health);
        }
    }
}
