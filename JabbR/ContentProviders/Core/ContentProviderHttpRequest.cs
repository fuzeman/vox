using System;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using JabbR.Infrastructure;

namespace JabbR.ContentProviders.Core
{
    public class ContentProviderHttpRequest
    {        
        public ContentProviderHttpRequest(Uri url)
        {
            RequestUri = url;
        }

        public Uri RequestUri { get; private set; }

        public Match Match { get; private set; }
    }
}