using System;
using JabbR.Models;

namespace JabbR.Commands
{
    [Command("kick", "Kick a user from the room. Note, this is only valid for owners of the room.", "user [message] [room] [imageUrl]", "user")]
    public class KickCommand : UserCommand
    {
        public override void Execute(CommandContext context, CallerContext callerContext, ChatUser callingUser, string[] args)
        {
            if (args.Length == 0)
            {
                throw new InvalidOperationException("Who are you trying to kick?");
            }

            string targetUserName = args[0];

            ChatUser targetUser = context.Repository.VerifyUser(targetUserName);

            string targetRoomName = args.Length > 1 ? args[1] : callerContext.RoomName;

            if (String.IsNullOrEmpty(targetRoomName))
            {
                throw new InvalidOperationException("Which room?");
            }

            ChatRoom room = context.Repository.VerifyRoom(targetRoomName);

            Uri imageUrl = null;
            if (args.Length >= 3)
                Uri.TryCreate(args[args.Length - 1], UriKind.Absolute, out imageUrl);

            string message = null;
            if (args.Length == 2)
                message = args[1];
            else if (args.Length == 3 && imageUrl != null)
                message = args[1];
            else if (args.Length > 2 && imageUrl == null)
                message = String.Join(" ", args, 1, args.Length - 1);
            else if (args.Length > 3 && imageUrl != null)
                message = String.Join(" ", args, 1, args.Length - 2);

            context.Service.KickUser(callingUser, targetUser, room, message, imageUrl);
            context.NotificationService.KickUser(targetUser, room, message, imageUrl);

            context.Repository.CommitChanges();
        }
    }
}