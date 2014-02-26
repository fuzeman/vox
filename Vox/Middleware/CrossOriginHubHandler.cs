using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using JabbR.Services;
using Microsoft.Owin;
using Ninject;

namespace JabbR.Middleware
{
    using AppFunc = Func<IDictionary<string, object>, Task>;

    public class CrossOriginHubHandler
    {
        private readonly AppFunc _next;
        private readonly ApplicationSettings _settings;

        public CrossOriginHubHandler(AppFunc next, IKernel kernel)
        {
            _next = next;

            _settings = kernel.Get<ApplicationSettings>();
        }

        private string GetOrigin(Uri uri)
        {
            return uri.Scheme + "://" + uri.Authority;
        }

        public async Task Invoke(IDictionary<string, object> env)
        {
            var context = new OwinContext(env);

            if (context.Request.Uri.AbsolutePath.StartsWith("/signalr"))
            {
                if (!string.IsNullOrWhiteSpace(_settings.Host) &&
                    context.Request.Uri.Authority == _settings.Host)
                {
                    context.Response.Headers["Access-Control-Allow-Origin"] = GetOrigin(context.Request.Uri);
                }
            }

            await _next(env);
        }
    }
}