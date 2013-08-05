using JabbR.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace JabbR.Commands
{
    [Command("mute", "Revoke a user's permission to send messages in a room. Only works if you're an owner of that room", "user [room]", "room")]
    public class MuteCommand : UserCommand
    {
        public override void Execute(CommandContext context, CallerContext callerContext, Models.ChatUser callingUser, string[] args)
        {
            if (args.Length == 0)
            {
                throw new InvalidOperationException("Who do you want to mute?");
            }

            var targetUserName = args[0];
            var targetUser = context.Repository.VerifyUser(targetUserName);

            var targetRoomName = args.Length > 1 ? args[1] : callerContext.RoomName;
            var targetRoom = context.Repository.VerifyRoom(targetRoomName, mustBeOpen: false);

            context.Service.MuteUser(callingUser, targetUser, targetRoom);

            context.NotificationService.MuteUser(targetUser, targetRoom);

            context.Repository.CommitChanges();
        }
    }
}