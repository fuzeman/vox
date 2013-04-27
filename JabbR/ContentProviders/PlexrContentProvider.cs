using System.Configuration;
using Gate;
using JabbR.ContentProviders.Core;
using JabbR.Infrastructure;
using System;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace JabbR.ContentProviders
{
    public interface IMusicService : IContentProvider
    {
        string PlexrReferenceKey { get; }
        string PlexrServiceKey { get; }

        string ExtractKey(Uri requestUri);
        Task<ContentProviderResult> GetCollapsibleContent(string id, string title = null);
    }

    public class PlexrContentProvider : CollapsibleContentProvider
    {
        private static readonly IMusicService[] Services = {
            new RdioContentProvider(),
            new SpotifyContentProvider(),
        };

        protected override Task<ContentProviderResult> GetCollapsibleContent(ContentProviderHttpRequest request)
        {
            // TODO: Support rdio.com/artist urls (requires Plexr support)
            if (request.RequestUri.Host.Contains("rdio.com"))
                return TaskAsyncHelper.FromResult<ContentProviderResult>(null);

            var fromService = Services.First(s => s.IsValidContent(request.RequestUri));
            var toService = Services.First(s => !s.IsValidContent(request.RequestUri));

            // TODO: Allow multiple "to" music services (requires Plexr support)

            var requestUrl =
                "http://" + ConfigurationManager.AppSettings["plexr:server"] + "/api/lookup/" +
                request.RequestUri.Host + request.RequestUri.AbsolutePath +
                "?return=" + toService.PlexrServiceKey + ':' + toService.PlexrReferenceKey;

            return Http.GetJsonAsync(requestUrl).Then(result =>
            {
                if (result == null)
                    return null;

                var results = (JArray) result;
                if (!results.Any())
                    return null;

                dynamic first = results[0];

                return new ContentProviderResult
                {
                    Content = "<PlexrContentProviderResult>" +
                        "<" + fromService.PlexrServiceKey + ">" +
                            fromService.ExtractKey(request.RequestUri) +
                        "</" + fromService.PlexrServiceKey + ">" +

                        "<" + first.ServiceKey + ">" + first.Value + "</" + first.ServiceKey + ">" +
                        "</PlexrContentProviderResult>",
                    Title = "Plexr",
                    Weight = 1
                };
            });
        }

        public override bool IsValidContent(Uri uri)
        {
            return Services.Any(service => service.IsValidContent(uri));
        }
    }
}