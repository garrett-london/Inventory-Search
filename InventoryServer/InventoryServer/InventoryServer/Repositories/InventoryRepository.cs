using InventoryServer.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace InventoryServer.Repositories
{
    public interface IInventoryRepository
    {
        Task<List<InventoryItem>> GetAllItemsAsync();
        Task<List<InventoryItem>> FindByPartNumberAsync(string partNumber);
        Task<List<InventoryItem>> QueryAsync(InventorySearchRequest request);
    }
}
