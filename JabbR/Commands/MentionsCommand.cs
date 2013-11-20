using System.Collections.Generic;
using JabbR.Models;
using System;
using System.Linq;

namespace JabbR.Commands
{
    [Command("mentions", "Mentions_CommandInfo", "[string,]", "user")]
    public class MentionsCommand : UserCommand
    {
        public override void Execute(CommandContext context, CallerContext callerContext, ChatUser callingUser, string[] args)
        {
            var mentions = ParseMentions(args);

            if (mentions.Length == 0)
            {
                // List current mentions for user
                var currentMentions = context.Repository.GetMentionsByUser(callingUser)
                                                        .Select(m => m.String);

                context.NotificationService.ChangeMentions(callingUser, currentMentions.ToArray(), false);
            }
            else if (mentions.Length > 5)
            {
                throw new InvalidOperationException("You are not allowed more than 5 mention strings.");
            }
            else
            {
                // Update mentions for user
                UpdateMentions(context, callingUser, mentions);
                context.NotificationService.ChangeMentions(callingUser, mentions);

                context.Repository.CommitChanges();
            }
        }

        private string[] ParseMentions(string[] args)
        {
            return String.Join(" ", args)
                         .Split(',')
                         .Where(p => p != String.Empty)
                         .Select(p => p.Trim().ToLower())
                         .Distinct()
                         .ToArray();
        }

        private void UpdateMentions(CommandContext context, ChatUser callingUser, IEnumerable<string> mentions)
        {
            var pending = new List<string>(mentions);

            // Remove mentions
            var userMentions = context.Repository.GetMentionsByUser(callingUser).ToList();
            foreach (var m in userMentions)
            {
                if (pending.Contains(m.String))
                    pending.Remove(m.String);
                else
                    context.Repository.Remove(m);
            }

            // Add mentions
            foreach (var s in pending)
            {
                context.Repository.Add(new ChatUserMention
                {
                    String = s,
                    UserKey = callingUser.Key
                });
            }
        }
    }
}