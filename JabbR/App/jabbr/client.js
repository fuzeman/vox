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
    };

    var $this = $(this),
        connection = $.connection,
        chat = connection.chat,
        options = {},
        initial = true;
    
    //
    // Chat Event Handlers
    //

    chat.client.logOn = function(rooms, myRooms, mentions) {
        console.log('[jabbr/client] logOn');
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
        
        initial: function() {
            return initial;
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
        
        bind: function(eventType, handler) {
            $this.bind(eventType, handler);
        },
    }
});