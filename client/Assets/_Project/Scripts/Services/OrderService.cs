using System.Collections.Generic;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;

namespace Harvesto.Services
{
    /// <summary>Wraps /orders/*. See GAME_DESIGN.md §6.11.</summary>
    public class OrderService
    {
        private readonly ApiClient _api;

        public OrderService(ApiClient api)
        {
            _api = api;
        }

        public Task<List<OrderDto>> GetTruckOrdersAsync() => _api.GetAsync<List<OrderDto>>("/orders/truck");
        public Task<List<OrderDto>> GetBoatOrdersAsync() => _api.GetAsync<List<OrderDto>>("/orders/boat");
        public Task<List<OrderDto>> GetTrainOrdersAsync() => _api.GetAsync<List<OrderDto>>("/orders/train");

        public Task<FulfillOrderResultDto> FulfillTruckAsync(string orderId)
        {
            return _api.PostAsync<FulfillOrderResultDto>("/orders/truck/fulfill", new { orderId });
        }

        public Task<FulfillOrderResultDto> FulfillBoatAsync(string orderId)
        {
            return _api.PostAsync<FulfillOrderResultDto>("/orders/boat/fulfill", new { orderId });
        }

        public Task<FulfillOrderResultDto> FulfillTrainAsync(string orderId)
        {
            return _api.PostAsync<FulfillOrderResultDto>("/orders/train/fulfill", new { orderId });
        }

        /// <summary>Routes to the right fulfill endpoint based on the order's own `source` field.</summary>
        public Task<FulfillOrderResultDto> FulfillAsync(OrderDto order)
        {
            return order.source switch
            {
                "BOAT" => FulfillBoatAsync(order.id),
                "TRAIN" => FulfillTrainAsync(order.id),
                _ => FulfillTruckAsync(order.id),
            };
        }
    }
}
