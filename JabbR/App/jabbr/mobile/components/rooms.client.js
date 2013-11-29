/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/components/rooms.client',
    
    'jabbr/core/events'
], function ($, Logger, kernel, RoomsClient, events) {
    var logger = new Logger('jabbr/mobile/components/rooms.client'),
        ru = null,
        users = null;

    return RoomsClient.extend({
        constructor: function () {
            this.base();
        },

        activate: function () {
            this.base();

            //client = kernel.get('jabbr/client');
            //ui = kernel.get('jabbr/ui');
            ru = kernel.get('jabbr/components/rooms.ui');
            users = kernel.get('jabbr/components/users');
            //messages = kernel.get('jabbr/components/messages');
        },
        
        populateRoomFromInfo: function (roomInfo) {
            var room = roomInfo.Name;

            $.each(roomInfo.Users, function () {
                users.createRoomUser(this, room);
            });

            $.each(roomInfo.Owners, function () {
                var user = users.get(this);

                if (user !== undefined && room in user.roomUsers) {
                    user.roomUsers[room].setOwner(true);
                } else {
                    logger.warn('unable to find user "' + this + '"');
                }
            });

            logger.info('loading recent messages');
            $.each(roomInfo.RecentMessages, $.proxy(function (i, message) {
                message.isHistory = true;
                ru.createMessage(message, room);
            }, this));
            logger.info('finished loading recent messages');
        }
    });
});