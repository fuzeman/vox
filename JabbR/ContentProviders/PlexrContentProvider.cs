using Gate;
using JabbR.ContentProviders.Core;
using JabbR.Infrastructure;
using System;
using System.Linq;
using System.Threading.Tasks;

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
                "http://plexr-a.apphb.com/api/lookup/" +
                request.RequestUri.Host + request.RequestUri.AbsolutePath +
                "?to=" + toService.PlexrServiceKey +
                "&return=" + toService.PlexrReferenceKey;

            return Http.GetJsonAsync(requestUrl).Then(result =>
            {
                if (result == null)
                    return null;

                return new ContentProviderResult
                {
                    Content = "<MusicServiceContentProviderResult>" +
                        "<" + fromService.PlexrServiceKey + ">" +
                            fromService.ExtractKey(request.RequestUri) +
                        "</" + fromService.PlexrServiceKey + ">" +

                        "<" + result.ServiceKey + ">" + result.Value + "</" + result.ServiceKey + ">" +
                        "</MusicServiceContentProviderResult>",
                    Title = "",
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