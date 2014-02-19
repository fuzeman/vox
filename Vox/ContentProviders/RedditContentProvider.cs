using JabbR.ContentProviders.Core;
using JabbR.Infrastructure;
using System;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace JabbR.ContentProviders
{
    public class RedditContentProvider : CollapsibleContentProvider
    {
        public readonly Regex UriRegex = new Regex(@"^https?:\/\/(?<value>(\w+.)?reddit.com(\/r\/\w+)?(\/comments\/\w+\/\w+(\/\w+)?)?)(\/)?(?<parameters>\?.*?)?$", RegexOptions.IgnoreCase);

        public RedditContentProvider()
        {
            BoxClasses = new[] { "collapsible_box", "no-padding" };

            TemplateHelper.Compile("ContentProvider/reddit");
        }

        protected override Task<ContentProviderResult> GetCollapsibleContent(ContentProviderHttpRequest request, Match match)
        {
            var value = match.Groups["value"].Value;

            if (match.Groups["parameters"].Success)
                value += match.Groups["parameters"].Value;

            return TaskAsyncHelper.FromResult(new ContentProviderResult
            {
                Content = TemplateHelper.Render("ContentProvider/reddit", new { location = value }),
                Title = "reddit"
            });
        }

        public override Match Match(Uri uri)
        {
            return UriRegex.Match(uri.AbsoluteUri);
        }
    }
}