/*global define*/
define(['jquery', 'kernel'], function ($, kernel) {
    var templates = {
        userlist: $('#new-userlist-template'),
        user: $('#new-user-template'),
        notification: $('#new-notification-template'),
        separator: $('#message-separator-template'),
        tab: $('#new-tab-template'),
        gravatarprofile: $('#gravatar-profile-template'),
        commandhelp: $('#command-help-template'),
        lobbyroom: $('#new-lobby-room-template'),
        otherlobbyroom: $('#new-other-lobby-room-template'),
        
        message: {
            plain: $('#new-message-template'),
            collapsible: $('#multiline-content-template')
        }
    };

    return function () {
        kernel.bind('jabbr/templates', templates);

        return templates;
    };
});