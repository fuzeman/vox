namespace JabbR.Models.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class AddChatRoomUserData : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.ChatRoomUserData",
                c => new
                    {
                        Key = c.Int(nullable: false, identity: true),
                        RoomKey = c.Int(nullable: false),
                        UserKey = c.Int(nullable: false),
                        IsMuted = c.Boolean(nullable: false),
                    })
                .PrimaryKey(t => t.Key)
                .ForeignKey("dbo.ChatRooms", t => t.RoomKey, cascadeDelete: true)
                .ForeignKey("dbo.ChatUsers", t => t.UserKey, cascadeDelete: true)
                .Index(t => t.RoomKey)
                .Index(t => t.UserKey);
            
        }
        
        public override void Down()
        {
            DropIndex("dbo.ChatRoomUserData", new[] { "UserKey" });
            DropIndex("dbo.ChatRoomUserData", new[] { "RoomKey" });
            DropForeignKey("dbo.ChatRoomUserData", "UserKey", "dbo.ChatUsers");
            DropForeignKey("dbo.ChatRoomUserData", "RoomKey", "dbo.ChatRooms");
            DropTable("dbo.ChatRoomUserData");
        }
    }
}
