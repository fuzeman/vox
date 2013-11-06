using System.Collections.Generic;
using JabbR.Models;
using System.Net.Http;

namespace JabbR.Services
{
    public class PushNotificationService
    {
        private HttpClient _httpClient;

        public PushNotificationService()
        {
            _httpClient = new HttpClient();
        }

        public void Send(Notification notification)
        {
            if (notification.Read) return;

            Send(notification.User, notification.Message);
        }

        public void Send(ChatUser user, ChatMessage message)
        {
            NotifyMyAndroid(user, message);
        }

        private void NotifyMyAndroid(ChatUser user, ChatMessage message)
        {
            var preferences = user.Preferences.PushNotifications.NMA;

            // Check preferences validity
            if (!preferences.Enabled || preferences.APIKey == null)
                return;

            var apikey = preferences.APIKey.Replace(" ", "");
            if (apikey.Length != 48)
                return;

            // Create event and description content values and add ellipsis if over limits
            var eventContent = message.Content;
            if (eventContent.Length > 1000)
                eventContent = eventContent.Substring(0, 1000 - 3) + "...";

            var descriptionContent = message.Content;
            if (descriptionContent.Length > 10000)
                descriptionContent = descriptionContent.Substring(0, 10000 - 3) + "...";

            var request = new Dictionary<string, string>
            {
                {"apikey", apikey},
                {"application", "iceJabbR"},
                {"event", eventContent},
                {"description", descriptionContent}
            };

            _httpClient.PostAsync("https://www.notifymyandroid.com/publicapi/notify", new FormUrlEncodedContent(request));
        }

        private void Pushover(ChatUser user, ChatMessage message)
        {
            
        }
    }
}