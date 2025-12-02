using InventoryServer.Models;
using InventoryServer.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Threading.Tasks;

namespace InventoryServer.Controllers
{
    [Route("api/inventory")]
    [ApiController]
    public class InventoryController : ControllerBase
    {
// TODO Implement the required code
        public InventoryController(IInventoryService inventoryService, IConfiguration configuration)
        {
// TODO Implement the required code
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
// TODO Implement the required code
        }

        [HttpGet("availability/peak")]
        public async Task<ActionResult<ResponseEnvelope<AvailabilityResult>>> GetPeakAvailability(
            [FromQuery] string partNumber)
        {
// TODO Implement the required code
        }

        [HttpGet("health")]
        public async Task<ActionResult<object>> Health()
        {
// TODO Implement the required code
        }
    }
}
