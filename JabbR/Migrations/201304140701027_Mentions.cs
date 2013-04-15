namespace JabbR.Models.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class Mentions : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.ChatUserMentions",
                c => new
                    {
                        Key = c.Int(nullable: false, identity: true),
                        UserKey = c.Int(nullable: false),
                        String = c.String(),
                    })
                .PrimaryKey(t => t.Key)
                .ForeignKey("dbo.ChatUsers", t => t.UserKey, cascadeDelete: true)
                .Index(t => t.UserKey);
            
        }
        
        public override void Down()
        {
            DropIndex("dbo.ChatUserMentions", new[] { "UserKey" });
            DropForeignKey("dbo.ChatUserMentions", "UserKey", "dbo.ChatUsers");
            DropTable("dbo.ChatUserMentions");
        }
    }
}
