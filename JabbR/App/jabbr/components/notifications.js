/*global define*/
define([
    'jquery',
    'jabbr/client',
    'jabbr/events'
], function ($, client, events) {
    var $unreadNotificationCount = $('#notification-unread-count'),
        ru = null,
        rc = null;

    function setUnreadNotifications(unreadCount) {
        if (unreadCount > 0) {
            $unreadNotificationCount.text(unreadCount);
            $unreadNotificationCount.show();
        } else {
            $unreadNotificationCount.text('');
            $unreadNotificationCount.hide();
        }
    }

    client.bind(events.client.loggedOn, function () {
        setUnreadNotifications(client.chat.state.unreadNotifications);
    });

    return {
        initialize: function (roomUi) {
            ru = roomUi;
            rc = roomUi.client;
        },
        messageNotification: function (message, room) {
            var roomName = room.getName(),
                isMention = message.highlight,
                notify = rc.getRoomPreference(roomName, 'notify') || 'mentions',
                currentRoomName = ru.getCurrentRoomElements().getName(),
                roomFocus = roomName === currentRoomName && ru.ui.isFocused();

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
});