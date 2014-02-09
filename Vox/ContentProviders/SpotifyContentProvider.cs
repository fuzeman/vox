using JabbR.ContentProviders.Core;
using System;
using System.Threading.Tasks;

namespace JabbR.ContentProviders
{
    public class SpotifyContentProvider : CollapsibleContentProvider, IMusicService
    {
        protected override Task<ContentProviderResult> GetCollapsibleContent(ContentProviderHttpRequest request)
        {
            return GetCollapsibleContent(ExtractKey(request.RequestUri));
        }

        public Task<ContentProviderResult> GetCollapsibleContent(string id, string title = null)
        {
            return TaskAsyncHelper.FromResult(new ContentProviderResult
            {
                Content = String.Format("<iframe src=\"https://embed.spotify.com/?uri={0}\" width=\"300\" height=\"380\" " +
                    "frameborder=\"0\" allowtransparency=\"true\"></iframe>", id),
                Title = title ?? id
            });
        }

        public string ExtractKey(Uri requestUri)
        {
            return "spotify:" + requestUri.AbsolutePath.Remove(0, 1).Replace('/', ':');
        }

        public string PlexrReferenceKey
        {
            get { return "Uri"; }
        }

        public string PlexrServiceKey
        {
            get { return "spotify"; }
        }

        public override bool IsValidContent(Uri uri)
        {
            return uri.AbsoluteUri.StartsWith("http://open.spotify.com/", StringComparison.CurrentCultureIgnoreCase);
        }
    }
}