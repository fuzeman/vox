using JabbR.Models;
using System;

namespace JabbR.Services
{
    public interface IChatNotificationService
    {
        void OnUserNameChanged(ChatUser user, string oldUserName, string newUserName);
        void MessageReadStateChanged(ChatUser mentionedUser, ChatMessage message, Notification notification);
        void UpdateUnreadMentions(ChatUser mentionedUser, int unread);
    }
}