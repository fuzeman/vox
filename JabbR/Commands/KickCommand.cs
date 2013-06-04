using System;
using JabbR.Models;
using JabbR.Services;

namespace JabbR.Commands
{
    [Command("kick", "Kick a user from the room. Note, this is only valid for owners of the room.",
        "user [message...] [room] [imageUrl]", "user")]
    public class KickCommand : UserCommand
    {
        public override void Execute(CommandContext context, CallerContext callerContext, ChatUser callingUser, string[] args)
        {
            if (args.Length == 0)
                throw new InvalidOperationException("Who are you trying to kick?");

            ChatUser targetUser = context.Repository.VerifyUser(args[0]);

            var parsedArguments = ParseArguments(context, args);
            var imageUrl = parsedArguments.ImageUrl;
            var room = parsedArguments.Room;

            var messageArgumentCount = args.Length - 1;

            if (imageUrl != null)
                messageArgumentCount -= 1;
            if (room != null)
                messageArgumentCount -= 1;

            if(room == null)
                room = context.Repository.VerifyRoom(callerContext.RoomName);


            string message = messageArgumentCount > 0 ? String.Join(" ", args, 1, messageArgumentCount) : null;

            context.Service.KickUser(callingUser, targetUser, room, message, imageUrl);
            context.NotificationService.KickUser(targetUser, room, message, imageUrl);

            context.Repository.CommitChanges();
        }

        private dynamic ParseArguments(CommandContext context, string[] args)
        {
            dynamic lastArgument = null;
            if (args.Length >= 2)
                lastArgument = ParseHybridArgument(context, args[args.Length - 1]);

            dynamic secondToLastArgument = null;
            if (args.Length >= 3)
                secondToLastArgument = ParseHybridArgument(context, args[args.Length - 2]);

            Uri imageUrl = null;
            ChatRoom room = null;

            if (!Object.ReferenceEquals(null, lastArgument))
            {
                if (lastArgument is Uri)
                    imageUrl = (Uri)lastArgument;

                if (lastArgument is ChatRoom)
                    room = (ChatRoom)lastArgument;
            }

            if (!Object.ReferenceEquals(null, secondToLastArgument))
            {
                if (secondToLastArgument is Uri)
                    imageUrl = (Uri)secondToLastArgument;

                if (secondToLastArgument is ChatRoom)
                    room = (ChatRoom)secondToLastArgument;
            }

            return new
            {
                ImageUrl = imageUrl,
                Room = room
            };
        }

        private dynamic ParseHybridArgument(CommandContext context, string value)
        {
            Uri imageUrl;
            if (Uri.TryCreate(value, UriKind.Absolute, out imageUrl))
                return imageUrl;

            var room = context.Repository.GetRoomByName(ChatService.NormalizeRoomName(value));
            if (room != null)
                return context.Repository.VerifyRoom(room.Name);

            throw new InvalidOperationException("Invalid imageUrl/room argument");
        }
    }
}