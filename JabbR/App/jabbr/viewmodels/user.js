/*global define*/
define([
    'jquery',
    'jquery.timeago'
], function ($) {
    var ru = null;

    function getNoteCssClass(user) {
        if (user.IsAfk === true) {
            return 'afk';
        } else if (user.Note) {
            return 'message';
        }
        return '';
    }

    function getNote(user) {
        if (user.IsAfk === true) {
            if (user.AfkNote) {
                return 'AFK - ' + user.AfkNote;
            }
            return 'AFK';
        }

        return user.Note;
    }

    function getFlagCssClass(user) {
        return (user.Flag) ? 'flag flag-' + user.Flag : '';
    }

    function User(roomUi, userdata, isOwner) {
        ru = roomUi;

        var lastActive = userdata.LastActivity.fromJsonDate();

        this.name = userdata.Name;
        this.hash = userdata.Hash;

        this.owner = isOwner;
        this.admin = userdata.IsAdmin;

        this.active = userdata.Active;

        this.noteClass = getNoteCssClass(userdata);
        this.note = getNote(userdata);

        this.flagClass = getFlagCssClass(userdata);
        this.flag = userdata.Flag;
        this.country = userdata.Country;

        this.lastActive = lastActive;
        this.timeAgo = $.timeago(lastActive);

        this.mention = userdata.Mention;

        this.roomUsers = {};  // { <roomName>: <RoomUser> }
    }

    return User;
});