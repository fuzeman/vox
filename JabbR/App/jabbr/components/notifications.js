/*global define*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/events'
], function ($, Logger, kernel, events) {
    var logger = new Logger('jabbr/components/notifications'),
        client = null,
        ui = null,
        rc = null,
        ru = null,
        object = null;

    var initialize = function() {
        var $unreadNotificationCount = $('#notification-unread-count');

        function setUnreadNotifications(unreadCount) {
            if (unreadCount > 0) {
                $unreadNotificationCount.text(unreadCount);
                $unreadNotificationCount.show();
            } else {
                $unreadNotificationCount.text('');
                $unreadNotificationCount.hide();
            }
        }

        function clientLoggedOn() {
            
        }
        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                ui = kernel.get('jabbr/ui');
                rc = kernel.get('jabbr/components/rooms.client');
                ru = kernel.get('jabbr/components/rooms.ui');

                logger.trace('activated');
                
                // Bind events
                client.bind(events.client.loggedOn, clientLoggedOn);
            },
            messageNotification: function(message, room) {
                var roomName = room.getName(),
                    isMention = message.highlight,
                    notify = rc.getRoomPreference(roomName, 'notify') || 'mentions',
                    currentRoomName = ru.getCurrentRoomElements().getName(),
                    roomFocus = roomName === currentRoomName && ui.isFocused();

                if (room.isInitialized()) {
                    var hasSound = rc.getRoomPreference(roomName, 'hasSound'),
                        canToast = rc.getRoomPreference(roomName, 'canToast');

                    if (isMention) {
                        // Mention Sound
                        if (roomFocus === false && hasSound === true) {
                            notify(true);
                        }
                        // Mention Popup
                        if (roomFocus === false && canToast === true) {
                            toast(message, true, roomName);
                        }
                    } else if (notify === 'all') {
                        // All Sound
                        if (roomFocus === false && hasSound === true) {
                            notifyRoom(roomName);
                        }
                        // All Popup
                        if (roomFocus === false && canToast === true) {
                            toastRoom(roomName, message);
                        }
                    }
                }
            }
        };
    };
    
    return function () {
        if (object == null) {
            object = initialize();
            kernel.bind('jabbr/components/notifications', object);
        }

        return object;
    }
});