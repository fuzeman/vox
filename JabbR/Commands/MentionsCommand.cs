using JabbR.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace JabbR.Commands
{
    [Command("mentions", "When a message contains one of these strings mark it as a mention.",
        "string[,string]", "user")]
    public class MentionOnCommand : UserCommand
    {
        public override void Execute(CommandContext context, CallerContext callerContext, Models.ChatUser callingUser, string[] args)
        {
            string[] mentions = String.Join(" ", args).Split(',');

            if (mentions.Length > 5)
            {
                throw new InvalidOperationException("You are not allowed more than 5 mention strings.");
            }

            List<string> pendingAdd = new List<string>();
            foreach (string s in mentions)
            {
                var st = s.Trim();
                if (!pendingAdd.Contains(st))
                    pendingAdd.Add(st);
            }
            mentions = pendingAdd.ToArray();

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
                    String = s.ToLower(),
                    UserKey = callingUser.Key
                });
            }

            context.NotificationService.ChangeMentions(callingUser, mentions);

            context.Repository.CommitChanges();
        }
    }
}