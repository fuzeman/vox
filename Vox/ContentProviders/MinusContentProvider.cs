using JabbR.ContentProviders.Core;
using Microsoft.Security.Application;
using System;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace JabbR.ContentProviders
{
    public class MinusContentProvider : CollapsibleContentProvider
    {
        private static readonly Regex UriRegex = new Regex("^https?://i(\\d+)?\\.minus.com/(?<id>.*?)\\.(?<ext>.*)$", RegexOptions.IgnoreCase);

        protected override Task<ContentProviderResult> GetCollapsibleContent(ContentProviderHttpRequest request, Match match)
        {
            if (!match.Success) throw new ArgumentException("Invalid match, expected a successful match", "match");

            var url = String.Format("https://i.minus.com/{0}.{1}", match.Groups["id"], match.Groups["ext"].Value);

            return TaskAsyncHelper.FromResult(new ContentProviderResult
            {
                Content = String.Format(ImageContentProvider.HtmlFormat,
                    Encoder.HtmlAttributeEncode(request.RequestUri.AbsoluteUri),
                    Encoder.HtmlAttributeEncode(url)),
                Title = url,
                Weight = 1
            });
        }

        public override Match Match(Uri uri)
        {
            return UriRegex.Match(uri.AbsoluteUri);
        }
    }
}