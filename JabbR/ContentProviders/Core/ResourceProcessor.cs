using System;
using System.Collections.Generic;
using System.ComponentModel.Composition;
using System.ComponentModel.Composition.Hosting;
using System.Linq;
using System.Threading.Tasks;
using JabbR.Services;
using Ninject;

namespace JabbR.ContentProviders.Core
{
    public class ResourceProcessor : IResourceProcessor
    {
        private readonly IKernel _kernel;
        private readonly IJabbrRepository _repository;
        private readonly IList<IContentProvider> _contentProviders;

        public ResourceProcessor(IKernel kernel)
        {
            _contentProviders = GetContentProviders(kernel);
            _kernel = kernel;
            _repository = kernel.Get<IJabbrRepository>();
        }

        public Task<ContentProviderResult> ExtractResource(string url)
        {
            Uri resultUrl;
            if (Uri.TryCreate(url, UriKind.Absolute, out resultUrl))
            {
                var request = new ContentProviderHttpRequest(resultUrl);
                return ExtractContent(request);
            }

            return TaskAsyncHelper.FromResult<ContentProviderResult>(null);
        }

        private Task<ContentProviderResult> ExtractContent(ContentProviderHttpRequest request)
        {
            var validProviders = _contentProviders.Select(p =>
            {
                var match = p.Match(request.RequestUri);

                return new
                {
                    Provider = p,
                    Match = match,
                    IsValid = (match != null && match.Success) || p.IsValidContent(request.RequestUri)
                };
            }).Where(c => c.IsValid).ToList();

            if (validProviders.Count == 0)
                return TaskAsyncHelper.FromResult<ContentProviderResult>(null);

            var tasks = validProviders.Select(c =>
            {
                c.Provider.Repository = _repository;
                return c.Match != null ?
                    c.Provider.GetContent(request, c.Match) :
                    c.Provider.GetContent(request);
            }).ToArray();

            var tcs = new TaskCompletionSource<ContentProviderResult>();

            Task.Factory.ContinueWhenAll(tasks, completedTasks =>
            {
                ContentProviderResult result = completedTasks.Where(t => !t.IsFaulted && !t.IsCanceled)
                                                             .Select(t => t.Result)
                                                             .Where(u => u != null)
                                                             .OrderByDescending(v => v.Weight)
                                                             .FirstOrDefault();
                if (result != null)
                {
                    tcs.SetResult(result);
                }
                else
                {

                    var faulted = completedTasks.FirstOrDefault(t => t.IsFaulted);
                    if (faulted != null)
                    {
                        tcs.SetException(faulted.Exception);
                    }
                    else if (completedTasks.Any(t => t.IsCanceled))
                    {
                        tcs.SetCanceled();
                    }
                }
            });

            return tcs.Task;
        }


        private static IList<IContentProvider> GetContentProviders(IKernel kernel)
        {
            // Use MEF to locate the content providers in this assembly
            var compositionContainer = new CompositionContainer(new AssemblyCatalog(typeof(ResourceProcessor).Assembly));
            compositionContainer.ComposeExportedValue(kernel);
            return compositionContainer.GetExportedValues<IContentProvider>().ToList();
        }
    }
}