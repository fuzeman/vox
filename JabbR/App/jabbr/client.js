/*global define, document, window, setTimeout*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/events',
    // Libraries
    'jquery.cookie',
    'jquery.signalr',
    'noext!signalr/hubs'
], function ($, Logger, kernel, events) {
    var logger = new Logger('jabbr/client'),
        object = null;
    logger.trace('loaded');

    var initialize = function() {
        var $window = $(window),
            $this = $(this),
            connection = $.connection,
            chat = connection.chat,
            options = {},
            initial = true;

        var privateRooms = null;

        //
        // Private Functions
        //

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
            setTimeout(function() {
                connection.hub.start(options).done(function() {
                    // When this works uncomment it.
                    // ui.showReloadMessageNotification();

                    // Turn the firehose back on
                    chat.server.join(true).fail(function() {
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

            $.post('account/logout', {}).done(function() {
                d.resolveWith(null);
                document.location = document.location.pathname;
            });

            return d.promise();
        }

        function focused() {
            events.trigger(events.ui.updateUnread);

            try {
                chat.server.updateActivity();
            } catch(e) {
                connection.hub.log('updateActivity failed');
            }
        }

        $window.bind(events.focused, focused);

        function logout() {
            performLogout().done(function() {
                chat.server.send('/logout', chat.state.activeRoom)
                    .fail(function(e) {
                        $window.trigger(events.error, [e, 'error', chat.state.activeRoom]);
                    });
            });
        }

        return {
            activate: function() {
                logger.trace('activated');
            },

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
                    chat.server.join().fail(function() {
                        logger.warn('join failed');
                    }).done(function() {
                        $this.trigger(events.client.started);
                    });
                });

                connection.hub.stateChanged(stateChanged);
                connection.hub.disconnected(disconnected);

                connection.hub.error(function() {
                    // Make all pending messages failed if there's an error
                    //failPendingMessages();
                });
            },

            focused: focused,
            logout: logout,

            bind: function(eventType, handler) {
                $this.bind(eventType, handler);
            }
        };
    };
    
    return function() {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/client', object);
        }

        return object;
    }
});