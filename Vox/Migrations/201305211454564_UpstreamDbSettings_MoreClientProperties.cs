namespace JabbR.Models.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class UpstreamDbSettings_MoreClientProperties : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Settings",
                c => new
                    {
                        Key = c.Int(nullable: false, identity: true),
                        RawSettings = c.String(),
                    })
                .PrimaryKey(t => t.Key);
            
            AddColumn("dbo.ChatClients", "Name", c => c.String());
            AddColumn("dbo.ChatClients", "LastClientActivity", c => c.DateTimeOffset(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.ChatClients", "LastClientActivity");
            DropColumn("dbo.ChatClients", "Name");
            DropTable("dbo.Settings");
        }
    }
}
