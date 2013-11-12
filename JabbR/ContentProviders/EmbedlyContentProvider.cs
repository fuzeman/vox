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
        private ApplicationSettings _settings;

        [ImportingConstructor]
        public EmbedlyContentProvider(IKernel kernel)
        {
            _kernel = kernel;
        }

        protected override Task<ContentProviderResult> GetCollapsibleContent(ContentProviderHttpRequest request)
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

                return CreateResult(result);
            });
        }

        private ContentProviderResult CreateResult(JObject result)
        {
            string content = null;

            var type = result.Value<string>("type");

            if (type == "photo")
            {
                var url = Encoder.HtmlAttributeEncode(result.Value<string>("url"));
                content = String.Format(ImageContentProvider.HtmlFormat, url, url);
            }
            else if (type == "rich")
            {
                content = result.Value<string>("html");
            }
            else
            {
                // Unsupported embedding type
                return null;
            }

            return new ContentProviderResult
            {
                Content = content,
                Title = result.Value<string>("title") ?? result.Value<string>("url"),
                Weight = -10 // Pick "native" content providers over Embed.ly
            };
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