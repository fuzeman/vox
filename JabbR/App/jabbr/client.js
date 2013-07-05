﻿define([
    'jquery',
    'logger',
    'jabbr/events',
    
    'jquery.cookie',
    'jquery.signalr',
    'noext!signalr/hubs'
], function ($, Logger, events) {
    var logger = new Logger('jabbr/client');
    logger.trace('loaded');

    var $window = $(window),
        $this = $(this),
        connection = $.connection,
        chat = connection.chat,
        options = {},
        initial = true;

    var originalTitle = document.title,
        privateRooms = null,
        unread = 0,
        isUnreadMessageForUser = false;
    
    //
    // Private Functions
    //
    
    function updateUnread(room, isMentioned) {
        if (ui.focus === false) {
            isUnreadMessageForUser = (isUnreadMessageForUser || isMentioned);

            unread = unread + 1;
        } else {
            //we're currently focused so remove
            //the * notification
            isUnreadMessageForUser = false;
        }

        events.trigger(events.ui.updateUnread, [room, isMentioned]);
        //ui.updateUnread(room, isMentioned);

        updateTitle();
    }
    
    function clearUnread() {
        isUnreadMessageForUser = false;
        unread = 0;
        updateUnread(chat.state.activeRoom, false);
    }
    
    function updateTitle() {
        // ugly hack via http://stackoverflow.com/a/2952386/188039
        setTimeout(function () {
            if (unread === 0) {
                document.title = originalTitle;
            } else {
                document.title = (isUnreadMessageForUser ? '*' : '') + '(' + unread + ') ' + originalTitle;
            }
        }, 200);
    }

    //
    // Chat Event Handlers
    //

    chat.client.logOn = function(rooms, myRooms, mentions) {
        logger.trace('logOn');

        privateRooms = myRooms;

        $this.trigger(events.client.loggedOn, [rooms, myRooms, mentions]);
    };

    chat.client.logOut = performLogout;

    //
    // Core Event Handlers
    //

    function stateChanged(change) {
        var eventData = [change, initial];
        $this.trigger(events.client.stateChanged, eventData);

        if (change.newState === $.connection.connectionState.connected) {
            $this.trigger(events.client.connected, eventData);
            initial = false;
        } else if (change.newState === $.connection.connectionState.reconnecting) {
            $this.trigger(events.client.reconnecting, eventData);
        }
    }

    function disconnected() {
        connection.hub.log('Dropped the connection from the server. Restarting in 5 seconds.');

        $this.trigger(events.client.disconnected);

        // Restart the connection
        setTimeout(function () {
            connection.hub.start(options).done(function () {
                // When this works uncomment it.
                // ui.showReloadMessageNotification();

                // Turn the firehose back on
                chat.server.join(true).fail(function (e) {
                    // So refresh the page, our auth token is probably gone
                    //performLogout();
                });
            });
        }, 5000);
    }

    function initialize() {
        var logging = $.cookie('jabbr.logging') === '1',
            transport = $.cookie('jabbr.transport');

        if (transport) {
            options.transport = transport;
        }

        connection.hub.logging = logging;
        connection.hub.qs = "version=" + window.jabbrVersion;
    }
    initialize();
    
    function performLogout() {
        var d = $.Deferred();
        
        $.post('account/logout', {}).done(function () {
            d.resolveWith(null);
            document.location = document.location.pathname;
        });

        return d.promise();
    }
    
    function focused() {
        clearUnread();

        try {
            chat.server.updateActivity();
        }
        catch (e) {
            connection.hub.log('updateActivity failed');
        }
    }

    $window.bind(events.focused, focused);

    function logout() {
        performLogout().done(function () {
            chat.server.send('/logout', chat.state.activeRoom)
                .fail(function (e) {
                    $window.trigger(events.error, [e, 'error', chat.state.activeRoom]);
                });
        });
    }

    return {
        events: events,
        
        $this: $this,
        connection: connection,
        chat: chat,
        
        getInitial: function() {
            return initial;
        },
        
        getPrivateRooms: function() {
            return privateRooms;
        },

        start: function() {
            connection.hub.start(options).done(function() {
                chat.server.join().fail(function(e) {
                    logger.warn('join failed');
                }).done(function () {
                    $this.trigger(events.client.started);
                });
            });

            connection.hub.stateChanged(stateChanged);
            connection.hub.disconnected(disconnected);

            connection.hub.error(function(err) {
                // Make all pending messages failed if there's an error
                //failPendingMessages();
            });
        },
        
        focused: focused,
        logout: logout,

        bind: function(eventType, handler) {
            $this.bind(eventType, handler);
        },
    }
});