using System;
using System.Linq;
using JabbR.Models;

namespace JabbR.Commands
{
    [Command("kick", "Kick a user from the room. Note, this is only valid for owners of the room.", "user [message] [imageUrl]", "user")]
    public class KickCommand : UserCommand
    {
        public override void Execute(CommandContext context, CallerContext callerContext, Models.ChatUser callingUser, string[] args)
        {
            if (args.Length == 0)
            {
                throw new InvalidOperationException("Who are you trying to kick?");
            }

            var room = context.Repository.VerifyUserRoom(context.Cache, callingUser, callerContext.RoomName);

            if (context.Repository.GetOnlineUsers(room).Count() == 1)
            {
                throw new InvalidOperationException("You're the only person in here...");
            }

            var targetUserName = args[0];
            var targetUser = context.Repository.VerifyUser(targetUserName);

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