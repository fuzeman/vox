define(['jabbr/client'], function (client) {
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

    client.bind(client.events.logOn, function() {
        setUnreadNotifications(chat.state.unreadNotifications);
    });
});