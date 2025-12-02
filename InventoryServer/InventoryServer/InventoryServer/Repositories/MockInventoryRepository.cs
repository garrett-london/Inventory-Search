using InventoryServer.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

// TODO Implement the required code
/*
You are free to determine how you want to create data to be returned 
Feel free to modify and/or expand the Interface as needed 
Must have at least enough data to demonstrate paging (4 or more pages)
*/
namespace InventoryServer.Repositories
{
    public class MockInventoryRepository : IInventoryRepository
    {
// TODO Implement the required code

        public MockInventoryRepository()
        {
// TODO Implement the required code
        }

        public Task<List<InventoryItem>> GetAllItemsAsync()
        {
// TODO Implement the required code
        }

        public Task<List<InventoryItem>> FindByPartNumberAsync(string partNumber)
        {
// TODO Implement the required code
        }

    }
}
