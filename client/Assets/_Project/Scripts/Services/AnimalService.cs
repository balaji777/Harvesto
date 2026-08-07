using System.Collections.Generic;
using System.Threading.Tasks;
using Harvesto.Domain;
using Harvesto.Networking;

namespace Harvesto.Services
{
    /// <summary>Wraps /animals/*. See GAME_DESIGN.md §6.3.</summary>
    public class AnimalService
    {
        private readonly ApiClient _api;

        public AnimalService(ApiClient api)
        {
            _api = api;
        }

        public Task<List<AnimalTypeDto>> GetAnimalTypesAsync() => _api.GetAsync<List<AnimalTypeDto>>("/animals/types");

        public Task<List<AnimalDto>> GetMyAnimalsAsync() => _api.GetAsync<List<AnimalDto>>("/animals");

        public Task<AnimalDto> BuyAsync(string animalTypeId, string buildingId)
        {
            return _api.PostAsync<AnimalDto>("/animals/buy", new { animalTypeId, buildingId });
        }

        public Task<AnimalDto> FeedAsync(string animalId)
        {
            return _api.PostAsync<AnimalDto>("/animals/feed", new { animalId });
        }

        public Task<CollectResultDto> CollectAsync(string animalId)
        {
            return _api.PostAsync<CollectResultDto>("/animals/collect", new { animalId });
        }
    }
}
