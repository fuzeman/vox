/*global define*/
define(['jquery'], function ($) {
    return {
        userlist: $('#new-userlist-template'),
        user: $('#new-user-template'),
        message: $('#new-message-template'),
        notification: $('#new-notification-template'),
        separator: $('#message-separator-template'),
        tab: $('#new-tab-template'),
        gravatarprofile: $('#gravatar-profile-template'),
        commandhelp: $('#command-help-template'),
        multiline: $('#multiline-content-template'),
        lobbyroom: $('#new-lobby-room-template'),
        otherlobbyroom: $('#new-other-lobby-room-template')
    };
});