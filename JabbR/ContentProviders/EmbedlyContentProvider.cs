using System;
using System.Threading.Tasks;
using JabbR.ContentProviders.Core;
using System.ComponentModel.Composition;
using JabbR.Infrastructure;
using Microsoft.Ajax.Utilities;
using Ninject;
using JabbR.Services;
using Microsoft.Security.Application;
using Newtonsoft.Json.Linq;

namespace JabbR.ContentProviders
{
    public class EmbedlyContentProvider : CollapsibleContentProvider
    {
        private readonly IKernel _kernel;
        private readonly IJabbrConfiguration _configuration;
        private ApplicationSettings _settings;

        [ImportingConstructor]
        public EmbedlyContentProvider(IKernel kernel)
        {
            _kernel = kernel;
            _configuration = kernel.Get<IJabbrConfiguration>();
        }

        public override Task<ContentProviderResult> GetContent(ContentProviderHttpRequest request)
        {
            // Delay the result until this is actually picked
            return ContentProviderResult.Create(GetResult, -10);
        }

        private Task<ContentProviderResult> GetResult(ContentProviderHttpRequest request)
        {
            if (_settings == null)
                _settings = _kernel.Get<ApplicationSettings>();

            var url = string.Format(
                "http://api.embed.ly/1/oembed?key={0}&url={1}&maxwidth=425&format=json",
                _settings.EmbedlyKey,
                Uri.EscapeDataString(request.RequestUri.AbsoluteUri)
            );

            return Http.GetJsonAsync(url).Then<dynamic, ContentProviderResult>(result =>
            {
                if (result == null)
                    return (ContentProviderResult) null;

                return ParseResult(result);
            });
        }

        private ContentProviderResult ParseResult(JObject result)
        {
            string content = null;

            var type = result.Value<string>("type");

            if (type == "photo")
            {
                var url = Encoder.HtmlAttributeEncode(SecureUrl(result.Value<string>("url")));
                content = String.Format(ImageContentProvider.HtmlFormat, url, url);
            }
            else if (type == "rich" || type == "video")
            {
                content = SecureEmbed(result.Value<string>("html"));
            }
            else if (type == "link")
            {
                content = string.Format(
                    "<div class=\"embedly-content\">" +
                        "<a rel=\"nofollow external\" target=\"_blank\" href=\"{0}\" class=\"imageContent\">" +
                            "<div class=\"thumbnail\" style=\"background-image: url('{0}')\"></div>" +
                        "</a>" +
                        "<a class=\"title\" href=\"{1}\"><h3>{2}</h3></a>" +
                        "<p>{3}</p>" +
                    "</div>",
                    SecureUrl(result.Value<string>("thumbnail_url")),
                    result.Value<string>("url"),
                    result.Value<string>("title"),
                    result.Value<string>("description")
                );
            }
            else
            {
                // Unsupported embedding type
                return null;
            }

            return ProcessResult(new ContentProviderResult{
                Title = GetTitle(result),
                Content = content
            });
        }

        private string SecureEmbed(string html)
        {
            if (!_configuration.RequireHttps)
                return html;

            html = html.Replace("src=\"http://", "src=\"https://");

            return html;
        }

        private string SecureUrl(string url)
        {
            if (!_configuration.RequireHttps)
                return url;

            return url.Replace("http://", "https://");
        }

        private string GetTitle(JObject result)
        {
            return result.Value<string>("title") ?? result.Value<string>("url");
        }

        public override bool IsValidContent(Uri uri)
        {
            if(_settings == null)
                _settings = _kernel.Get<ApplicationSettings>();

            if (_settings.EmbedlyKey.IsNullOrWhiteSpace())
                return false;

            // valid for everything, requires a request to actually determine what
            // embedding is available.
            return true;
        }
    }
}