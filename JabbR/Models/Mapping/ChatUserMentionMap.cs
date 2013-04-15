using System;
using System.Collections.Generic;
using System.Data.Entity.ModelConfiguration;
using System.Linq;
using System.Web;

namespace JabbR.Models.Mapping
{
    public class ChatUserMentionMap : EntityTypeConfiguration<ChatUserMention>
    {
        public ChatUserMentionMap()
        {
            // Primary Key
            this.HasKey(m => m.Key);

            // Properties
            // Table & Column Mappings
            this.ToTable("ChatUserMentions");
            this.Property(m => m.Key).HasColumnName("Key");
            this.Property(m => m.String).HasColumnName("String");

            this.HasRequired(a => a.User)
                .WithMany(u => u.Mentions)
                .HasForeignKey(a => a.UserKey);
        }
    }
}