namespace JabbR.Models.ChatUserPreferenceSections
{
    public class PushNotifications
    {
        public NotifyMyAndroid NMA { get; set; }

        public Pushover Pushover { get; set; }
    }

    public class NotifyMyAndroid
    {
        public bool Enabled { get; set; }

        public string APIKey { get; set; }
    }

    public class Pushover
    {
        public bool Enabled { get; set; }

        public string UserKey { get; set; }

        public string DeviceName { get; set; }
    }
}