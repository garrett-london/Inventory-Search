using InventoryServer.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace InventoryServer.Repositories
{
	// TODO Implement the required code
/*
You are free to determine how you want to create data to be returned 
Feel free to modify and/or expand the Interface as needed 
Must have at least enough data to demonstrate paging (4 or more pages)
*/
    public interface IInventoryRepository
    {
        Task<List<InventoryItem>> GetAllItemsAsync();
        Task<List<InventoryItem>> FindByPartNumberAsync(string partNumber);
    }
}
