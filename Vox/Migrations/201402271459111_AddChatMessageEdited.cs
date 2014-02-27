namespace JabbR.Models.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddChatMessageEdited : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.ChatMessages", "Edited", c => c.DateTimeOffset(precision: 7));
        }
        
        public override void Down()
        {
            DropColumn("dbo.ChatMessages", "Edited");
        }
    }
}
