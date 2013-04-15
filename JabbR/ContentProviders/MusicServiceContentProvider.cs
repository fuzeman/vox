using JabbR.ContentProviders.Core;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace JabbR.ContentProviders
{
    public class MusicServiceContentProvider : CollapsibleContentProvider
    {
        public static readonly IContentProvider[] _providers = new IContentProvider[] {
            new RdioContentProvider(), new SpotifyContentProvider()
        };

        protected override Task<ContentProviderResult> GetCollapsibleContent(ContentProviderHttpRequest request)
        {
            return TaskAsyncHelper.FromResult<ContentProviderResult>(null);
        }

        public override bool IsValidContent(Uri uri)
        {
            foreach (IContentProvider provider in _providers)
            {
                if (provider.IsValidContent(uri)) return true;
            }
            return false;
        }
    }
}