using JabbR.Models;
using System;
using System.Linq;

namespace JabbR.Services
{
    public interface IJabbrRepository : IDisposable
    {
        IQueryable<ChatRoom> Rooms { get; }
        IQueryable<ChatUser> Users { get; }
        IQueryable<ChatClient> Clients { get; }

        IQueryable<ChatUser> GetOnlineUsers(ChatRoom room);
        IQueryable<ChatUser> GetOnlineUsers();

        IQueryable<ChatUser> SearchUsers(string name);
        IQueryable<ChatMessage> GetMessagesByRoom(ChatRoom room);
        IQueryable<ChatMessage> GetPreviousMessages(string messageId);
        IQueryable<ChatRoom> GetAllowedRooms(ChatUser user);
        IQueryable<Notification> GetNotificationsByUser(ChatUser user, bool extended = false);
        ChatMessage GetMessageById(string id);
        int GetMessageCount();

        ChatUser GetUserById(string userId);
        ChatRoom GetRoomByName(string roomName);

        ChatUser GetUserByName(string userName);
        ChatUser GetUserByClientId(string clientId);
        ChatUser GetUserByLegacyIdentity(string userIdentity);
        ChatUser GetUserByIdentity(string providerName, string userIdentity);
        ChatRoomUserData GetRoomUserData(ChatUser user, ChatRoom room);
        Notification GetNotificationById(int notificationId);
        Notification GetNotificationByMessage(ChatMessage message, ChatUser user);

        IQueryable<ChatUserMention> GetMentions();
        IQueryable<ChatUserMention> GetMentionsByUser(ChatUser callingUser);

        ChatClient GetClientById(string clientId, bool includeUser = false);

        void AddUserRoom(ChatUser user, ChatRoom room);
        void RemoveUserRoom(ChatUser user, ChatRoom room);

        void Add(ChatClient client);
        void Add(ChatMessage message);
        void Add(ChatRoom room);
        void Add(ChatRoomUserData roomUserData);
        void Add(ChatUser user);
        void Add(ChatUserIdentity identity);
        void Add(ChatUserMention mention);
        void Add(Attachment attachment);

        void Remove(ChatClient client);
        void Remove(ChatRoom room);
        void Remove(ChatRoomUserData roomUserData);
        void Remove(ChatUser user);
        void Remove(ChatUserIdentity identity);
        void Remove(ChatUserMention mention);
        void Update(ChatMessage message);
        void CommitChanges();

        bool IsUserInRoom(ChatUser user, ChatRoom room);

        // Reload entities from the store
        void Reload(object entity);

        void Add(Notification notification);
        void Remove(Notification notification);
    }
}