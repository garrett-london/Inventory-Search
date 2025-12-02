namespace InventoryServer.Models
{
    public class ResponseEnvelope<T>
    {
        public bool IsFailed { get; set; }
        public string Message { get; set; }
        public T Data { get; set; }

        public static ResponseEnvelope<T> Success(T data)
        {
            return new ResponseEnvelope<T>
            {
                IsFailed = false,
                Data = data
            };
        }

        public static ResponseEnvelope<T> Failure(string message)
        {
            return new ResponseEnvelope<T>
            {
                IsFailed = true,
                Message = message ?? "Request failed"
            };
        }
    }
}
