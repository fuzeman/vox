using JabbR.ContentProviders.Core;
using JabbR.Infrastructure;
using System;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Nancy.Helpers;

namespace JabbR.ContentProviders
{
    public class RdioContentProvider : CollapsibleContentProvider, IMusicService
    {
        private static readonly Regex ExtractShortKeyRegex = new Regex(
            "^http(s)?://rd.io/x/(?<shortKey>.*?)/?$", RegexOptions.IgnoreCase);

        protected override Task<ContentProviderResult> GetCollapsibleContent(ContentProviderHttpRequest request)
        {
            var shortKey = ExtractKey(request.RequestUri);

            if (shortKey != null)
                return GetCollapsibleContent(shortKey);

            return Http.GetJsonAsync("http://www.rdio.com/api/oembed/?format=json&url=" +
                HttpUtility.UrlEncode(request.RequestUri.AbsoluteUri)).Then(result => new ContentProviderResult
            {
                Content = result.html,
                Title = result.title
            });
        }

        public Task<ContentProviderResult> GetCollapsibleContent(string id, string title = null)
        {
            return TaskAsyncHelper.FromResult(new ContentProviderResult
            {
                Content = String.Format("<iframe width=\"500\" height=\"250\" src=\"https://rd.io/i/{0}//?source=oembed\" " +
                    "frameborder=\"0\"></iframe>", id),
                Title = title ?? id
            });
        }

        public string ExtractKey(Uri requestUri)
        {
            var m = ExtractShortKeyRegex.Match(requestUri.AbsoluteUri);
            var result = m.Success ? m.Groups["shortKey"].Value : null;

            return result;
        }

        public string PlexrReferenceKey
        {
            get { return "ShortKey"; }
        }

        public string PlexrServiceKey
        {
            get { return "rdio"; }
        }

        public override bool IsValidContent(Uri uri)
        {
            return uri.AbsoluteUri.StartsWith("http://rd.io/x/", StringComparison.CurrentCultureIgnoreCase) ||
                   uri.AbsoluteUri.StartsWith("http://www.rdio.com/artist/", StringComparison.CurrentCultureIgnoreCase);
        }
    }
}