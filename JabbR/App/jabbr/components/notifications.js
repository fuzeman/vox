define(['jabbr/client', 'jabbr/events'], function (client, events) {
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

    client.bind(events.client.loggedOn, function() {
        setUnreadNotifications(chat.state.unreadNotifications);
    });
});