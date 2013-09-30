using System;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Claims;
using System.Security.Principal;
using System.Threading;

using Nancy;
using Nancy.Bootstrapper;
using Nancy.Bootstrappers.Ninject;
using Nancy.Owin;
using Nancy.Security;

using Ninject;
using Nancy.Cookies;

namespace JabbR.Nancy
{
    public class JabbRNinjectNancyBootstrapper : NinjectNancyBootstrapper
    {
        private readonly IKernel _kernel;

        public JabbRNinjectNancyBootstrapper(IKernel kernel)
        {
            _kernel = kernel;
        }

        protected override IKernel GetApplicationContainer()
        {
            return _kernel;
        }

        protected override void ApplicationStartup(IKernel container, IPipelines pipelines)
        {
            Conventions.ViewLocationConventions.Add((viewName, model, context) =>
            {
                string view_mode = null;

                // Try get the current view_mode from cookies
                if (context.Context.Request.Cookies.ContainsKey("view_mode"))
                {
                    var cookie_value = context.Context.Request.Cookies["view_mode"];

                    if (cookie_value == "desktop" || cookie_value == "mobile")
                        view_mode = cookie_value;
                }

                // Try determine the view_mode to use via the user agent
                if (view_mode == null)
                {
                    if (UserAgentDetect.IsSmartphone(context.Context.Request.Headers.UserAgent))
                        view_mode = "mobile";
                }

                // Default to desktop
                if (view_mode == null)
                    view_mode = "desktop";

                // Set cookie
                context.Context.NegotiationContext.Cookies.Add(new NancyCookie("view_mode", view_mode));

                return string.Join("/", new[] {"views", view_mode, context.ModuleName.ToLower(), viewName});
            });

            base.ApplicationStartup(container, pipelines);

            Csrf.Enable(pipelines);

            pipelines.BeforeRequest.AddItemToStartOfPipeline(FlowPrincipal);
            pipelines.BeforeRequest.AddItemToStartOfPipeline(SetCulture);
        }

        private Response FlowPrincipal(NancyContext context)
        {
            var env = Get<IDictionary<string, object>>(context.Items, NancyOwinHost.RequestEnvironmentKey);
            if (env != null)
            {
                var principal = Get<IPrincipal>(env, "server.User") as ClaimsPrincipal;
                if (principal != null)
                {
                    context.CurrentUser = new ClaimsPrincipalUserIdentity(principal);
                }

                var appMode = Get<string>(env, "host.AppMode");

                if (!String.IsNullOrEmpty(appMode) &&
                    appMode.Equals("development", StringComparison.OrdinalIgnoreCase))
                {
                    context.Items["_debugMode"] = true;
                }
                else
                {
                    context.Items["_debugMode"] = false;
                }
            }

            return null;
        }

        private Response SetCulture(NancyContext ctx)
        {
            Thread.CurrentThread.CurrentCulture = ctx.Culture;
            Thread.CurrentThread.CurrentUICulture = ctx.Culture;
            return null;
        }

        private static T Get<T>(IDictionary<string, object> env, string key)
        {
            object value;
            if (env.TryGetValue(key, out value))
            {
                return (T)value;
            }
            return default(T);
        }
    }
}