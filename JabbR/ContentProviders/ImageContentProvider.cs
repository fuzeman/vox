using JabbR.ContentProviders.Core;
using JabbR.Infrastructure;
using JabbR.Services;
using JabbR.UploadHandlers;
using Microsoft.Security.Application;
using Newtonsoft.Json.Linq;
using Ninject;
using System;
using System.ComponentModel.Composition;
using System.IO;
using System.Net;
using System.Threading.Tasks;

namespace JabbR.ContentProviders
{
    public class ImageContentProvider : CollapsibleContentProvider
    {
        private const string ImgurClientId = "aebab8fdb4d1989";
        private const string ImgurUploadUrl = "https://api.imgur.com/3/image.json?image={0}";

        public const string HtmlFormat = @"<a rel=""nofollow external"" target=""_blank"" href=""{0}"" class=""imageContent""><img src=""{1}"" /></a>";

        private readonly IKernel _kernel;
        private readonly IJabbrConfiguration _configuration;
        private ILogger _logger;

        protected override async Task<ContentProviderResult> GetCollapsibleContent(ContentProviderHttpRequest request)
        {
            if (_logger == null)
                _logger = _kernel.Get<ILogger>();

            var imageUrl = request.RequestUri.ToString();
            var href = imageUrl;

            // Serve non-https images via imgur
            if (_configuration.RequireHttps &&
                !request.RequestUri.Scheme.Equals("https", StringComparison.OrdinalIgnoreCase))
            {
                imageUrl = await Upload(imageUrl);
            }

            return new ContentProviderResult()
            {
                Content = String.Format(HtmlFormat,
                    Encoder.HtmlAttributeEncode(href),
                    Encoder.HtmlAttributeEncode(imageUrl)),
                Title = href
            };
        }

        [ImportingConstructor]
        public ImageContentProvider(IKernel kernel)
        {
            _kernel = kernel;
            _configuration = kernel.Get<IJabbrConfiguration>();
        }

        public override bool IsValidContent(Uri uri)
        {
            return IsValidImagePath(uri) &&
                !uri.Host.EndsWith("imgur.com") &&
                !uri.Host.EndsWith("minus.com");
        }

        public static bool IsValidImagePath(Uri uri)
        {
            string path = uri.LocalPath.ToLowerInvariant();

            return path.EndsWith(".png") ||
                   path.EndsWith(".bmp") ||
                   path.EndsWith(".jpg") ||
                   path.EndsWith(".jpeg") ||
                   path.EndsWith(".gif");
        }

        public static string GetContentType(Uri uri)
        {
            string extension = Path.GetExtension(uri.LocalPath).ToLowerInvariant();

            switch (extension)
            {
                case ".png":
                    return "image/png";

                case ".bmp":
                    return "image/bmp";

                case ".gif":
                    return "image/gif";

                case ".jpg":
                case ".jpeg":
                    return "image/jpeg";
            }

            return null;
        }

        private async Task<string> Upload(string url)
        {
            try
            {
                var request = (HttpWebRequest)WebRequest.Create(
                    String.Format(ImgurUploadUrl, Uri.EscapeDataString(url)));

                request.Method = "POST";
                request.Headers.Set("Authorization", "Client-ID " + ImgurClientId);

                var content = new MemoryStream();
                var task = request.GetResponseAsync();

                if (!task.Wait(new TimeSpan(0, 0, 5)))
                {
                    _logger.LogError("Upload Timeout");
                }

                using (var responseStream = task.Result.GetResponseStream())
                {
                    await responseStream.CopyToAsync(content);
                }

                content.Position = 0;
                dynamic json = JObject.Parse(ReadStream(content));

                return ((string)json.data.link).Replace("http://", "https://");
            }
            catch (WebException ex)
            {
                PrintWebException(ex);
            }
            catch (AggregateException aex)
            {
                if (aex.InnerException is WebException)
                    PrintWebException(aex.InnerException as WebException);
                else
                    _logger.LogError(aex.InnerException.Message);
            }

            return null;
        }

        private static string ReadStream(Stream stream)
        {
            string content;
            using (var reader = new StreamReader(stream))
            {
                content = reader.ReadToEnd();
            }
            stream.Close();
            return content;
        }

        private void PrintWebException(WebException webException)
        {
            _logger.LogError("(ImageContentProvider)");

            if (webException == null)
                return;

            _logger.LogError("(ImageContentProvider) [WebException]: " + webException);
            try
            {
                var content = ReadStream(webException.Response.GetResponseStream());
                _logger.LogError("(ImageContentProvider) Content: {0}", content);
            }
            catch (WebException ex)
            {
                _logger.LogError("(ImageContentProvider) [WebException] GetResponseStream() [WebException]: " + ex);
            }
            catch (Exception ex)
            {
                _logger.LogError("(ImageContentProvider) [WebException] GetResponseStream() [Exception]: " + ex);
            }
        }
    }
}