using JabbR.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace JabbR.Commands
{
    [Command("mentions", "When a message contains one of these strings mark it as a mention.",
        "[string,]", "user")]
    public class MentionOnCommand : UserCommand
    {
        public override void Execute(CommandContext context, CallerContext callerContext, Models.ChatUser callingUser, string[] args)
        {
            List<string> pendingAdd = String.Join(" ", args).Split(',')
                .Select(p => p.Trim().ToLower()).Distinct().ToList();
            string[] mentions = pendingAdd.ToArray();

            if (mentions.Length > 5)
            {
                throw new InvalidOperationException("You are not allowed more than 5 mention strings.");
            }

            // Remove mentions
            List<ChatUserMention> userMentions = context.Repository.GetMentionsByUser(callingUser).ToList();
            foreach (ChatUserMention m in userMentions)
            {
                if (pendingAdd.Contains(m.String))
                    pendingAdd.Remove(m.String);
                else
                    context.Repository.Remove(m);
            }

            // Add mentions
            foreach (string s in pendingAdd)
            {
                context.Repository.Add(new ChatUserMention { 
                    String = s,
                    UserKey = callingUser.Key
                });
            }

            context.NotificationService.ChangeMentions(callingUser, mentions);

            context.Repository.CommitChanges();
        }
    }
}