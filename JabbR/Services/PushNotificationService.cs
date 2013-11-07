using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using JabbR.Infrastructure;
using JabbR.Models;
using System.Net.Http;
using Microsoft.Ajax.Utilities;

namespace JabbR.Services
{
    public class PushNotificationService
    {
        private readonly HttpClient _httpClient;
        private readonly ApplicationSettings _settings;
        private readonly ILogger _logger;

        public PushNotificationService(ApplicationSettings settings, ILogger logger)
        {
            _httpClient = new HttpClient();
            _settings = settings;
            _logger = logger;
        }

        public void SendAsync(Notification notification)
        {
            if (notification.Read) return;

            SendAsync(notification.User, notification.Message);
        }

        public void SendAsync(ChatUser user, ChatMessage message)
        {
            Task.Run(() => Send(user, message));
        }

        public void Send(ChatUser user, ChatMessage message)
        {
            if (user.Preferences == null || user.Preferences.PushNotifications == null)
                return;

            _logger.Log("Send user: {0}, message: {1}", user.Id, message.Id);

            try
            {
                NotifyMyAndroid(user, message);
                Pushover(user, message);
            }
            catch (Exception ex)
            {
                _logger.Log("Send error: {0}", ex.ToString());
            }
        }

        private string GetTitle(ChatMessage message, int lengthLimit = 0)
        {
            var title = string.Format("Message from {0} in #{1}", message.User.Name, message.Room.Name);

            if (lengthLimit > 0 && title.Length > lengthLimit)
                title = title.Substring(0, lengthLimit - 3) + "...";

            return title;
        }

        private async void NotifyMyAndroid(ChatUser user, ChatMessage message)
        {
            var preferences = user.Preferences.PushNotifications.NMA;

            // Check preferences validity
            if (preferences == null || !preferences.Enabled || preferences.APIKey == null)
                return;

            var apikey = preferences.APIKey.Replace(" ", "");
            if (apikey.Length != 48)
                return;

            // Create event and description content values and add ellipsis if over limits

            var descriptionContent = message.Content;
            if (descriptionContent.Length > 10000)
                descriptionContent = descriptionContent.Substring(0, 10000 - 3) + "...";

            var request = new Dictionary<string, string>
            {
                {"apikey", apikey},
                {"application", "iceJabbR"},
                {"event", GetTitle(message, 100)},
                {"description", descriptionContent}
            };

            var result = await _httpClient.PostAsync("https://www.notifymyandroid.com/publicapi/notify", new FormUrlEncodedContent(request));

            _logger.Log("Send NotifyMyAndroid: {0}", result.StatusCode);
        }

        private async void Pushover(ChatUser user, ChatMessage message)
        {
            if (_settings.PushoverAPIKey.IsNullOrWhiteSpace())
                return;

            // Check preferences validity
            var preferences = user.Preferences.PushNotifications.Pushover;

            if (preferences == null || !preferences.Enabled || preferences.UserKey.IsNullOrWhiteSpace())
                return;

            var request = new Dictionary<string, string>
            {
                {"token", _settings.PushoverAPIKey},
                {"user", preferences.UserKey},
                {"title", GetTitle(message)},
                {"message", message.Content}
            };

            if (!preferences.DeviceName.IsNullOrWhiteSpace())
                request["device"] = preferences.DeviceName;

            var result = await _httpClient.PostAsync("https://api.pushover.net/1/messages.json", new FormUrlEncodedContent(request));

            _logger.Log("Send Pushover: {0}", result.StatusCode);
        }
    }
}