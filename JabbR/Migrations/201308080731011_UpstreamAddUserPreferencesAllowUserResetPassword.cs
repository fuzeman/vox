namespace JabbR.Models.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class UpstreamAddUserPreferencesAllowUserResetPassword : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.ChatUsers", "RequestPasswordResetId", c => c.String());
            AddColumn("dbo.ChatUsers", "RequestPasswordResetValidThrough", c => c.DateTimeOffset());
            AddColumn("dbo.ChatUsers", "RawPreferences", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.ChatUsers", "RawPreferences");
            DropColumn("dbo.ChatUsers", "RequestPasswordResetValidThrough");
            DropColumn("dbo.ChatUsers", "RequestPasswordResetId");
        }
    }
}
