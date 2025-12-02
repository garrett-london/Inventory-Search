
using InventoryServer.Models;
using InventoryServer.Repositories;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace InventoryServer.Services
{
	// TODO Implement the required code
/*
You are free to determine how you want to create data to be returned 
Feel free to modify and/or expand the Interface as needed 
Must have at least enough data to demonstrate paging (4 or more pages)
*/

    public class InventoryService : IInventoryService
    {
      // TODO Implement the required code
      public InventoryService(IInventoryRepository repository, IConfiguration configuration)
      {
         // TODO Implement the required code        }
      }

        public async Task<SearchResult> SearchInventoryAsync(InventorySearchRequest request)
      {
         // TODO Implement the required code        }
      }

        public async Task<AvailabilityResult> GetPeakAvailabilityAsync(string partNumber)
        {
// TODO Implement the required code
        }

// TODO Implement the required code
    }
}
