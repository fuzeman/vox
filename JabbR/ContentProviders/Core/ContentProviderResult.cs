
using System;
using System.Threading.Tasks;
namespace JabbR.ContentProviders.Core
{
    public class ContentProviderResult
    {
        public string Title { get; set; }
        public string Content { get; set; }
        public int Weight { get; set; }

        private readonly Func<ContentProviderHttpRequest, Task<ContentProviderResult>> _task;


        public ContentProviderResult() { }

        public ContentProviderResult(string title, string content, int weight = 0)
        {
            Title = title;
            Content = content;
            Weight = weight;
        }

        public ContentProviderResult(Func<ContentProviderHttpRequest, Task<ContentProviderResult>> task, int weight = 0)
        {
            Weight = weight;

            _task = task;
        }


        public static Task<ContentProviderResult> Create(string title, string content, int weight = 0)
        {
            return TaskAsyncHelper.FromResult(new ContentProviderResult(title, content, weight));
        }

        public static Task<ContentProviderResult> Create(Func<ContentProviderHttpRequest, Task<ContentProviderResult>> task, int weight = 0)
        {
            return TaskAsyncHelper.FromResult(new ContentProviderResult(task, weight));
        }


        public Task<ContentProviderResult> Execute(ContentProviderHttpRequest request)
        {
            if (Title != null && Content != null)
                return TaskAsyncHelper.FromResult(this);

            if(_task == null)
                throw new ArgumentNullException("task", "Task is required if no title and content parameter is given.");

            return _task(request);
        }
    }
}