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

    var initialize = function () {
        var $window = $(window),
            $this = $(this),
            connection = $.connection,
            chat = connection.chat,
            options = {},
            initial = true,
            mentionStrings = null,
            customMentionRegex = null,
            privateRooms = null,
            logging = $.cookie('jabbr.logging') === '1',
            transport = $.cookie('jabbr.transport');

        if (transport) {
            options.transport = transport;
        }

        connection.hub.logging = logging;
        connection.hub.qs = "version=" + window.jabbrVersion;

        function generateCustomMentionRegex(strings) {
            if (strings === null || strings.length < 1) {
                return null;
            }

            var pattern = "(\\W|^)(?:" + strings.join("|") + ")(\\W|$)";

            return new RegExp(pattern, "i");
        }

        function updateMentions(mentions) {
            mentionStrings = mentions;
            customMentionRegex = generateCustomMentionRegex(mentions);
        }

        //
        // Chat Event Handlers
        //

        chat.client.logOn = function (rooms, myRooms, userPreferences, mentions, notifications) {
            logger.trace('logOn');

            updateMentions(mentions);
            privateRooms = myRooms;

            $this.trigger(events.client.loggedOn, [rooms, myRooms, userPreferences, mentions, notifications]);
        };

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
                    chat.server.join(true).fail(function () {
                        // So refresh the page, our auth token is probably gone
                        performLogout();
                    });
                });
            }, 5000);
        }

        function performLogout() {
            var d = $.Deferred();

            $.post('account/logout', {}).done(function () {
                d.resolveWith(null);
                document.location = document.location.pathname;
            });

            return d.promise();
        }

        chat.client.logOut = performLogout;

        function focused() {
            events.trigger(events.ui.clearUnread);
            $this.trigger(events.client.activityUpdated);

            try {
                chat.server.updateActivity();
            } catch (e) {
                connection.hub.log('updateActivity failed');
            }
        }

        $window.bind(events.focused, focused);

        function logout() {
            performLogout().done(function () {
                chat.server.send('/logout', chat.state.activeRoom)
                    .fail(function (e) {
                        if (e.source == 'HubException') {
                            $window.trigger(events.error, [e.message, 'error', chat.state.activeRoom]);
                        }
                    });
            });
        }

        return {
            activate: function () {
                logger.trace('activated');
            },

            events: events,

            $this: $this,
            connection: connection,
            chat: chat,

            getInitial: function () {
                return initial;
            },

            getPrivateRooms: function () {
                return privateRooms;
            },

            getMentionStrings: function () {
                return mentionStrings;
            },

            getCustomMentionRegex: function () {
                return customMentionRegex;
            },

            updateMentions: updateMentions,

            start: function () {
                connection.hub.start(options).done(function () {
                    chat.server.join().fail(function () {
                        logger.warn('join failed');
                    }).done(function () {
                        $this.trigger(events.client.started);
                    });
                });

                connection.hub.stateChanged(stateChanged);
                connection.hub.disconnected(disconnected);

                connection.hub.error(function () {
                    // Make all pending messages failed if there's an error
                    // TODO messages.failPendingMessages();
                });
            },

            focused: focused,
            performLogout: performLogout,
            logout: logout,

            bind: function (eventType, handler) {
                $this.bind(eventType, handler);
            }
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/client', object);
        }

        return object;
    };
});