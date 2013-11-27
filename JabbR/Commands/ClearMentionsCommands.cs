using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace JabbR.Commands
{
    [Command("clearmentions", "ClearMentions_CommandInfo", "", "user")]
    public class ClearMentionsCommands : UserCommand
    {
        public override void Execute(CommandContext context, CallerContext callerContext, Models.ChatUser callingUser, string[] args)
        {
            var userMentions = context.Repository.GetMentionsByUser(callingUser).ToList();

            foreach (var m in userMentions)
            {
                context.Repository.Remove(m);
            }

            context.NotificationService.ChangeMentions(callingUser, null);

            context.Repository.CommitChanges();
        }
    }
}