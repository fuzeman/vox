using System;
using System.ComponentModel.Composition;
using System.IO;
using System.Threading.Tasks;
using JabbR.ContentProviders.Core;
using JabbR.Infrastructure;
using JabbR.Services;
using JabbR.UploadHandlers;
using Microsoft.Security.Application;
using Ninject;
using System.Net;
using Newtonsoft.Json.Linq;

namespace JabbR.ContentProviders
{
    public class ImageContentProvider : CollapsibleContentProvider
    {
        private const string ImgurClientId = "aebab8fdb4d1989";
        private const string ImgurUploadUrl = "https://api.imgur.com/3/image.json?image={0}";

        private const string format = @"<a rel=""nofollow external"" target=""_blank"" href=""{0}"" class=""imageContent""><img src=""{1}"" /></a>";

        private readonly IKernel _kernel;
        private readonly IJabbrConfiguration _configuration;

        protected override async Task<ContentProviderResult> GetCollapsibleContent(ContentProviderHttpRequest request)
        {
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
                Content = String.Format(format, Encoder.HtmlAttributeEncode(href), 
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
            return IsValidImagePath(uri);
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

        private static async Task<string> Upload(string url)
        {
            var request = (HttpWebRequest)WebRequest.Create(
                String.Format(ImgurUploadUrl, Uri.EscapeDataString(url)));

            request.Method = "POST";
            request.Headers.Set("Authorization", "Client-ID " + ImgurClientId);

            var content = new MemoryStream();

            using (var response = await request.GetResponseAsync())
            {
                using (var responseStream = response.GetResponseStream())
                {
                    await responseStream.CopyToAsync(content);
                }
            }

            dynamic json = JObject.Parse(ReadStream(content));
            return ((string)json.data.link).Replace("http://", "https://");
        }

        private static string ReadStream(Stream stream)
        {
            stream.Position = 0;
            string content;
            using (var reader = new StreamReader(stream))
            {
                content = reader.ReadToEnd();
            }
            stream.Close();
            return content;
        }
    }
}
