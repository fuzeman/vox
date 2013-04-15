using JabbR.Models;
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.Linq;

namespace JabbR.Infrastructure
{
    public static class MentionExtractor
    {
        private const string UsernameMentionPattern = @"(?<user>(?<=@{1}(?!@))[a-zA-Z0-9-_\.]{1,50})";
        private const string CustomMentionPattern = @"(?<=\s|,|\.|\(|\[|^)(?:{0})(?=\s|,|\.|\)|\]|$)";
        private const string GroupFormat = @"(?<{0}>{1})";

        private static string _customCachedPattern = null;
        private static int[] _customCachedPatternMentions;

        public static IList<string> ExtractMentions(string message, IQueryable<ChatUserMention> mentions = null)
        {
            if (message == null)
            {
                return new List<string>();
            }

            var matches = new List<string>();

            // Find username mentions
            foreach (Match m in Regex.Matches(message, UsernameMentionPattern))
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

            // Find custom mentions
            Regex regex = new Regex(GetPattern(mentions), RegexOptions.IgnoreCase);
            foreach (Match match in regex.Matches(message))
            {
                if (match.Success)
                {
                    for (int i = 1; i < match.Groups.Count; i++)
                    {
                        if (match.Groups[i].Success)
                        {
                            matches.Add(regex.GroupNameFromNumber(i));
                        }
                    }
                }
            }

            return matches;
        }

        public static string GetPattern(IQueryable<ChatUserMention> mentions)
        {
            // Rebuild if nothing is cached
            if (_customCachedPattern == null || _customCachedPatternMentions == null)
                return UpdatePattern(mentions.ToList());

            // Check all the users are in the pattern
            int addedCount = mentions.Where(p => !_customCachedPatternMentions.Contains(p.Key)).Count();
            if (addedCount > 0)
            {
                return UpdatePattern(mentions.ToList());
            }

            List<int> currentKeys = mentions.Select(p => p.Key).ToList();
            int removedCount = _customCachedPatternMentions.Where(p => !currentKeys.Contains(p)).Count();
            if (removedCount > 0)
            {
                return UpdatePattern(mentions.ToList());
            }

            return _customCachedPattern;
        }

        public static string UpdatePattern(IList<ChatUserMention> mentions)
        {
            _customCachedPattern = string.Format(CustomMentionPattern, String.Join("|",
                mentions.GroupBy(g => g.UserKey)
                        .Select(p => string.Format(GroupFormat, p.First().User.Name,
                            String.Join("|",
                                p.Select(j => j.String)
                                    .Concat(new [] { p.First().User.Name })
                            )
                        ))
            ));
            _customCachedPatternMentions = mentions.Select(p => p.Key).ToArray();
            return _customCachedPattern;
        }
    }
}