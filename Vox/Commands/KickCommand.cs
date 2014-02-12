using System;
using System.Linq;
using Microsoft.AspNet.SignalR;
using JabbR.Models;
using JabbR.Services;
using System.Collections.Generic;

namespace JabbR.Commands
{
    [Command("kick", "Kick_CommandInfo", "user [room] [message...] [imageUrl]", "user")]
    public class KickCommand : UserCommand
    {
        public override void Execute(CommandContext context, CallerContext callerContext, ChatUser callingUser, string[] args)
        {
            if (args.Length == 0)
                throw new HubException(LanguageResources.Kick_UserRequired);

            var targetUser = context.Repository.VerifyUser(args[0]);

            string targetRoomName = args.Length > 1 ? args[1] : callerContext.RoomName;

            if (String.IsNullOrEmpty(targetRoomName))
                throw new HubException(LanguageResources.Kick_RoomRequired);

            var parsedArguments = ParseArguments(context, args.Skip(2).ToList());
            var room = context.Repository.VerifyRoom(targetRoomName);

            context.Service.KickUser(callingUser, targetUser, room, parsedArguments.Item2, parsedArguments.Item1);
            context.NotificationService.KickUser(targetUser, room, parsedArguments.Item2, parsedArguments.Item1);
            context.Repository.CommitChanges();
        }

        private Tuple<Uri, string> ParseArguments(CommandContext context, IReadOnlyList<string> args)
        {
            if (args.Count == 0)
            {
                return new Tuple<Uri, string>(null, null);
            }

            var lastArgument = ParseUri(args[args.Count - 1]);

            Uri imageUrl = null;
            string message;

            if (lastArgument != null)
            {
                imageUrl = lastArgument;
                message = args.Count > 1 ? String.Join(" ", args.Take(args.Count - 1)) : null;
            }
            else
            {
                message = String.Join(" ", args);
            }

            return new Tuple<Uri, string>(imageUrl, message);
        }

        private Uri ParseUri(string value)
        {
            Uri imageUrl;
            return Uri.TryCreate(value, UriKind.Absolute, out imageUrl) ? imageUrl : null;
        }
    }
}