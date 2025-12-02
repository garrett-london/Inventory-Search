using System.Collections.Generic;

namespace InventoryServer.Models
{
    public class AvailabilityResult
    {
        public string PartNumber { get; set; }
        public int TotalAvailable { get; set; }
        public List<BranchAvailability> Branches { get; set; }
    }

    public class BranchAvailability
    {
        public string Branch { get; set; }
        public int Qty { get; set; }
    }
}
