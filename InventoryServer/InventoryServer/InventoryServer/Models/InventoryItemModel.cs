
using System;
using System.Collections.Generic;

namespace InventoryServer.Models
{
    public class InventoryItem
    {
        public string PartNumber { get; set; }
        public string SupplierSku { get; set; }
        public string Description { get; set; }
        public string Branch { get; set; }
        public int AvailableQty { get; set; }
        public string Uom { get; set; }
        public int? LeadTimeDays { get; set; }
        public DateTime? LastPurchaseDate { get; set; }
        public List<LotInfo> Lots { get; set; }
    }

    public class LotInfo
    {
        public string LotNumber { get; set; }
        public int Qty { get; set; }
        public DateTime? ExpirationDate { get; set; }
    }
}
