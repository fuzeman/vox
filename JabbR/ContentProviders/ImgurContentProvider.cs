using System;
using System.Linq;
using System.Threading.Tasks;
using JabbR.ContentProviders.Core;
using System.Text.RegularExpressions;
using Microsoft.Security.Application;

namespace JabbR.ContentProviders
{
    public class ImgurContentProvider : CollapsibleContentProvider
    {
        private static readonly Regex UriRegex = new Regex("^https?://(i\\.)?imgur.com/(?<id>\\w+)(\\.(?<ext>\\w+))?$", RegexOptions.IgnoreCase);

        protected override Task<ContentProviderResult> GetCollapsibleContent(ContentProviderHttpRequest request, Match match)
        {
            if (!match.Success || match.Groups["id"].Value == "")
                return null;

            var url = String.Format("https://i.imgur.com/{0}.{1}", match.Groups["id"],
                                    match.Groups["ext"].Success ? match.Groups["ext"].Value : "jpg");

            url = Encoder.HtmlAttributeEncode(url);

            return TaskAsyncHelper.FromResult(new ContentProviderResult
            {
                Content = String.Format(ImageContentProvider.HtmlFormat, url, url),
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