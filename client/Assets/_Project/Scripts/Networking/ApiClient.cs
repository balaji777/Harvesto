using System;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using UnityEngine;
using UnityEngine.Networking;

namespace Harvesto.Networking
{
    /// <summary>
    /// Thin JSON/HTTP wrapper over UnityWebRequest. Owns the current bearer
    /// token; every service in Services/ goes through this instead of
    /// touching UnityWebRequest directly, so auth/error handling stays in
    /// one place (see GAME_DESIGN.md §9.2 — client predicts, server is truth).
    /// </summary>
    public class ApiClient
    {
        private readonly string _baseUrl;
        private string _accessToken;

        public ApiClient(string baseUrl)
        {
            _baseUrl = baseUrl.TrimEnd('/');
        }

        public void SetAccessToken(string accessToken)
        {
            _accessToken = accessToken;
        }

        public Task<TResponse> GetAsync<TResponse>(string path)
        {
            return SendAsync<TResponse>(UnityWebRequest.kHttpVerbGET, path, null);
        }

        public Task<TResponse> PostAsync<TResponse>(string path, object body = null)
        {
            return SendAsync<TResponse>(UnityWebRequest.kHttpVerbPOST, path, body);
        }

        private async Task<TResponse> SendAsync<TResponse>(string method, string path, object body)
        {
            var url = _baseUrl + path;
            using var request = new UnityWebRequest(url, method);

            if (body != null)
            {
                var json = JsonConvert.SerializeObject(body);
                var bytes = Encoding.UTF8.GetBytes(json);
                request.uploadHandler = new UploadHandlerRaw(bytes);
                request.SetRequestHeader("Content-Type", "application/json");
            }

            request.downloadHandler = new DownloadHandlerBuffer();
            if (!string.IsNullOrEmpty(_accessToken))
            {
                request.SetRequestHeader("Authorization", $"Bearer {_accessToken}");
            }

            await request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                throw new ApiException(request.responseCode, request.downloadHandler?.text, request.error);
            }

            var responseText = request.downloadHandler.text;
            if (string.IsNullOrEmpty(responseText) || typeof(TResponse) == typeof(Unit))
            {
                return default;
            }

            return JsonConvert.DeserializeObject<TResponse>(responseText);
        }
    }

    /// <summary>Marker type for endpoints that return no body (e.g. 204 No Content).</summary>
    public sealed class Unit
    {
    }

    public class ApiException : Exception
    {
        public long StatusCode { get; }
        public string ResponseBody { get; }

        public ApiException(long statusCode, string responseBody, string error)
            : base($"API request failed ({statusCode}): {error}\n{responseBody}")
        {
            StatusCode = statusCode;
            ResponseBody = responseBody;
        }
    }

    /// <summary>Lets `await request.SendWebRequest()` work without a coroutine.</summary>
    public static class UnityWebRequestAwaiterExtensions
    {
        public static UnityWebRequestAwaiter GetAwaiter(this UnityWebRequestAsyncOperation asyncOp)
        {
            return new UnityWebRequestAwaiter(asyncOp);
        }
    }

    public readonly struct UnityWebRequestAwaiter : INotifyCompletion
    {
        private readonly UnityWebRequestAsyncOperation _asyncOp;

        public UnityWebRequestAwaiter(UnityWebRequestAsyncOperation asyncOp)
        {
            _asyncOp = asyncOp;
        }

        public bool IsCompleted => _asyncOp.isDone;

        public void GetResult()
        {
        }

        public void OnCompleted(Action continuation)
        {
            _asyncOp.completed += _ => continuation();
        }
    }
}
