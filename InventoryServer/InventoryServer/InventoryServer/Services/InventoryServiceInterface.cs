using InventoryServer.Models;
using System.Threading.Tasks;

namespace InventoryServer.Services
{
	// TODO Implement the required code
/*
You are free to determine how you want to create data to be returned 
Feel free to modify and/or expand the Interface as needed 
Must have at least enough data to demonstrate paging (4 or more pages)
*/
    public interface IInventoryService
    {
        Task<SearchResult> SearchInventoryAsync(InventorySearchRequest request);
        Task<AvailabilityResult> GetPeakAvailabilityAsync(string partNumber);
    }
}
