
namespace InventoryServer.Models
{
    public class InventorySearchRequest
    {
        public string Criteria { get; set; } = "";
        public string By { get; set; } = "PartNumber";
        public string Branches { get; set; } = "";
        public bool OnlyAvailable { get; set; } = false;
        public int Page { get; set; } = 0;
        public int Size { get; set; } = 20;
        public string Sort { get; set; } = "";
    }
}
