using JabbR.ContentProviders.Core;
using JabbR.Infrastructure;
using Nancy.Helpers;
using System;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace JabbR.ContentProviders
{
    public class RdioContentProvider : CollapsibleContentProvider
    {
        protected override Task<ContentProviderResult> GetCollapsibleContent(ContentProviderHttpRequest request)
        {
            return Fetch(request.RequestUri.AbsoluteUri).Then(result =>
            {
                if (result == null) return null;

                return new ContentProviderResult()
                {
                    Content = result.html,
                    Title = result.title
                };
            });
        }

        private static Task<dynamic> Fetch(string pageUrl)
        {
            return Http.GetJsonAsync(String.Format("http://www.rdio.com/api/oembed/?format=json&url={0}", HttpUtility.UrlEncode(pageUrl)));
        }

        public override bool IsValidContent(Uri uri)
        {
            return uri.AbsoluteUri.StartsWith("http://rd.io/x/", StringComparison.CurrentCultureIgnoreCase) ||
                   uri.AbsoluteUri.StartsWith("http://www.rdio.com/artist/", StringComparison.CurrentCultureIgnoreCase) ||
                   uri.AbsoluteUri.StartsWith("http://www.rdio.com/people/", StringComparison.CurrentCultureIgnoreCase);
        }
    }
}