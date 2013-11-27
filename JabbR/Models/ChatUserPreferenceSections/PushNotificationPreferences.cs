namespace JabbR.Models.ChatUserPreferenceSections
{
    public class PushNotificationPreferences
    {
        public NotifyMyAndroidPreferences NMA { get; set; }

        public PushoverPreferences Pushover { get; set; }

        public PushbulletPreferences Pushbullet { get; set; }
    }

    public class NotifyMyAndroidPreferences
    {
        public bool Enabled { get; set; }

        public string APIKey { get; set; }
    }

    public class PushoverPreferences
    {
        public bool Enabled { get; set; }

        public string UserKey { get; set; }

        public string DeviceName { get; set; }
    }

    public class PushbulletPreferences
    {
        public bool Enabled { get; set; }

        public string APIKey { get; set; }

        public string Devices { get; set; }
    }
}