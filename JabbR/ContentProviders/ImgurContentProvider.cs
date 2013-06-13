using System;
using System.Linq;
using System.Threading.Tasks;
using JabbR.ContentProviders.Core;
using System.Text.RegularExpressions;

namespace JabbR.ContentProviders
{
    public class ImgurContentProvider : CollapsibleContentProvider
    {
        private static readonly Regex UriRegex = new Regex("^https?://(i\\.)?imgur.com/(?<id>.*?)(\\.(?<ext>.*))?$", RegexOptions.IgnoreCase);

        protected override Task<ContentProviderResult> GetCollapsibleContent(ContentProviderHttpRequest request, Match match)
        {
            if(!match.Success) throw new ArgumentException("Invalid match, expected a successful match", "match");

            var url = String.Format("https://i.imgur.com/{0}.{1}", match.Groups["id"],
                                    match.Groups["ext"].Success ? match.Groups["ext"].Value : "jpg");

            return TaskAsyncHelper.FromResult(new ContentProviderResult
            {
                Content = String.Format(@"<img src=""{0}"" />", url),
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