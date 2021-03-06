﻿using System;
using System.Threading.Tasks;
using JabbR.ContentProviders.Core;
using Microsoft.Security.Application;
using JabbR.Services;
using System.Text.RegularExpressions;

namespace JabbR.ContentProviders
{
    public class AudioContentProvider : IContentProvider
    {
        public bool IsValidContent(Uri uri)
        {
            return uri.AbsolutePath.EndsWith(".mp3", StringComparison.OrdinalIgnoreCase) ||
                   uri.AbsolutePath.EndsWith(".wav", StringComparison.OrdinalIgnoreCase) ||
                   uri.AbsolutePath.EndsWith(".ogg", StringComparison.OrdinalIgnoreCase);
        }

        public Task<ContentProviderResult> GetContent(ContentProviderHttpRequest request)
        {
            string url = request.RequestUri.ToString();
            return TaskAsyncHelper.FromResult(new ContentProviderResult()
            {
                Content = String.Format(@"<audio controls=""controls"" src=""{1}"">{0}</audio>", LanguageResources.AudioTagSupportRequired, Encoder.HtmlAttributeEncode(url)),
                Title = request.RequestUri.AbsoluteUri
            });
        }

        public Task<ContentProviderResult> GetContent(ContentProviderHttpRequest request, Match match)
        {
            throw new NotImplementedException();
        }

        public Match Match(Uri uri)
        {
            return null;
        }

        public IJabbrRepository Repository { get; set; }
    }
}