using System;
using System.Collections.Generic;
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
        public List<string> HostExceptions = new List<string>
        {
            "docs.google.com"
        }; 

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
                if (!CreateLinkContent(result, out content))
                    return null;
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

        private bool CreateLinkContent(JObject result, out string content)
        {
            content = null;

            // container

            var container = "";

            var thumbnail = SecureUrl(result.Value<string>("thumbnail_url"));
            if (thumbnail == null)
                return false;

            container += string.Format(
                "<a rel=\"nofollow external\" target=\"_blank\" href=\"{0}\" class=\"imageContent\">" +
                    "<div class=\"thumbnail\" style=\"background-image: url('{0}')\"></div>" +
                "</a>",
                thumbnail
            );

            // right content

            var right = "";

            var url = result.Value<string>("url");
            var title = result.Value<string>("title");

            if (url != null && title != null)
            {
                right += string.Format(
                    "<a class=\"title\" target=\"_blank\" href=\"{0}\"><h3>{1}</h3></a>",
                    url,
                    title
                );
            }

            var description = result.Value<string>("description");

            if (description != null)
            {
                right += "<p>" + description + "</p>";
            }

            if (right.Length == 0)
                return false;

            container += "<div class=\"content\">" + right + "</div>";


            if (container.Length == 0)
                return false;

            if (description == null || description.Length < 50)
                return false;

            content = string.Format(
                "<div class=\"embedly-content{0}\">" + container + "</div>",
                thumbnail != null ? " embedly-thumbnail" : ""
            );
            return true;
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
            if (url == null)
                return null;

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

            if (HostExceptions.Contains(uri.Host))
                return false;

            // valid for everything, requires a request to actually determine what
            // embedding is available.
            return true;
        }
    }
}