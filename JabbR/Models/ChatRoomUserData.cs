using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Web;

namespace JabbR.Models
{
    [Table("ChatRoomUserData")]
    public class ChatRoomUserData
    {
        [Key]
        public int Key { get; set; }

        // Room
        public virtual ChatRoom Room { get; set; }
        public int RoomKey { get; set; }

        // User
        public virtual ChatUser User { get; set; }
        public int UserKey { get; set; }

        // Data
        public bool IsMuted { get; set; }
    }
}