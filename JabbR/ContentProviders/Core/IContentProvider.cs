using System.Text.RegularExpressions;
using JabbR.Services;
using System;
using System.ComponentModel.Composition;
using System.Threading.Tasks;

namespace JabbR.ContentProviders.Core
{
    [InheritedExport]
    public interface IContentProvider
    {
        Task<ContentProviderResult> GetContent(ContentProviderHttpRequest request);
        Task<ContentProviderResult> GetContent(ContentProviderHttpRequest request, Match match);

        bool IsValidContent(Uri uri);
        Match Match(Uri uri);

        IJabbrRepository Repository { set; }
    }
}