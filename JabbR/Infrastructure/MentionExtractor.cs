using JabbR.Models;
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace JabbR.Infrastructure
{
    public static class MentionExtractor
    {
        private const string Pattern = @"(?<user>(?<=@{1}(?!@))[a-zA-Z0-9-_\.]{1,50})";

        public static IList<string> ExtractMentions(string message, IList<ChatUserMention> userMentions = null)
        {
            if (message == null)
            {
                return new List<string>();
            }

            var matches = new List<string>();

            // Find @ mentions
            foreach (Match m in Regex.Matches(message, Pattern))
            {
                if (m.Success)
                {
                    string user = m.Groups["user"].Value.Trim();
                    if (!String.IsNullOrEmpty(user))
                    {
                        matches.Add(user);
                    }
                }
            }

            // Find string mentions
            if (userMentions != null)
            {
                var messageLower = message.ToLower();
                foreach (ChatUserMention m in userMentions)
                {
                    if (messageLower.Contains(m.String))
                    {
                        matches.Add(m.User.Name);
                    }
                }
            }

            return matches;
        }
    }
}