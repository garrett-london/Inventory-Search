using System.Collections.Generic;

namespace InventoryServer.Models
{
    public class SearchResult
    {
        public int Total { get; set; }
        public List<InventoryItem> Items { get; set; }
    }
}
