define([
    'jquery',    
    'jquery.cookie',
    'jquery.signalr',
    'noext!signalr/hubs'
], function($) {
    console.log('[jabbr/client]');

    var events = {
        started: 'jabbr.client.started',
        
        stateChanged: 'jabbr.client.stateChanged',
        connected: 'jabbr.client.connected',
        disconnected: 'jabbr.client.disconnected',
        reconnecting: 'jabbr.client.reconnecting',
        
        logOn: 'jabbr.client.logOn',
        
        updateUnread: 'jabbr.client.updateUnread',
    };

    var $this = $(this),
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
        if (ui.hasFocus() === false) {
            isUnreadMessageForUser = (isUnreadMessageForUser || isMentioned);

            unread = unread + 1;
        } else {
            //we're currently focused so remove
            //the * notification
            isUnreadMessageForUser = false;
        }

        $this.trigger(events.updateUnread, [room, isMentioned])
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
        console.log('[jabbr/client] logOn');

        privateRooms = myRooms;

        $this.trigger(events.logOn, [rooms, myRooms, mentions]);
    };

    //
    // Core Event Handlers
    //

    function stateChanged(change) {
        var eventData = [change, initial];
        $this.trigger(events.stateChanged, eventData);

        if (change.newState === $.connection.connectionState.connected) {
            $this.trigger(events.connected, eventData);
            initial = false;
        } else if (change.newState === $.connection.connectionState.reconnecting) {
            $this.trigger(events.reconnecting, eventData);
        }
    }

    function disconnected() {
        connection.hub.log('Dropped the connection from the server. Restarting in 5 seconds.');

        $this.trigger(events.disconnected);

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
                    console.log('[jabbr/client] join failed');
                }).done(function() {
                    $this.trigger(events.started);
                });
            });

            connection.hub.stateChanged(stateChanged);
            connection.hub.disconnected(disconnected);

            connection.hub.error(function(err) {
                // Make all pending messages failed if there's an error
                //failPendingMessages();
            });
        },
        
        focus: function() {
            clearUnread();

            try {
                chat.server.updateActivity();
            }
            catch (e) {
                connection.hub.log('updateActivity failed');
            }
        },
        
        bind: function(eventType, handler) {
            $this.bind(eventType, handler);
        },
    }
});