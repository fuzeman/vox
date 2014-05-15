using System;
using System.Threading.Tasks;
using JabbR.ContentProviders.Core;
using System.Text.RegularExpressions;
using JabbR.Infrastructure;
using Newtonsoft.Json.Linq;

namespace JabbR.ContentProviders
{
    public class GfycatContentProvider : CollapsibleContentProvider
    {
        private static readonly Regex UriRegex = new Regex("^https?://gfycat.com/(?<name>\\w+)$", RegexOptions.IgnoreCase);

        public GfycatContentProvider()
        {
            TemplateHelper.Compile("ContentProvider/gfycat");
        }

        protected override Task<ContentProviderResult> GetCollapsibleContent(ContentProviderHttpRequest request, Match match)
        {
            if (!match.Success || match.Groups["name"].Value == "")
                return null;

            var url = string.Format(
                "http://gfycat.com/cajax/get/{0}",
                match.Groups["name"].Value
            );

            return Http.GetJsonAsync(url).Then<dynamic, ContentProviderResult>(result =>
            {
                if (result == null)
                    return (ContentProviderResult)null;

                return ParseResult(result);
            });
        }

        private ContentProviderResult ParseResult(JObject result)
        {
            var item = result["gfyItem"];

            if (item == null)
                return null;

            return new ContentProviderResult
            {
                Content = TemplateHelper.Render("ContentProvider/gfycat", new
                {
                    name = item.Value<string>("gfyName"),

                    width = item.Value<int>("width"),
                    height = item.Value<int>("height"),

                    webm = item.Value<string>("webmUrl"),
                    mp4 = item.Value<string>("mp4Url"),
                    gif = item.Value<string>("gifUrl")
                }),
                Title = item.Value<string>("title") ?? item.Value<string>("gfyName")
            };
        }

        public override Match Match(Uri uri)
        {
            return UriRegex.Match(uri.AbsoluteUri);
        }
    }
}