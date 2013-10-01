define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/base/event-object',
    'jabbr/core/events',

    'jquery.cookie',
    'jquery.signalr',
    'noext!signalr/hubs'
], function ($, Logger, kernel, EventObject, events) {
    var logger = new Logger('jabbr/client');

    logger.trace('loaded');

    return EventObject.extend({
        constructor: function () {
            this.base();

            this.connection = $.connection;

            this.logging = $.cookie('jabbr.logging') === '1',
            this.connection.hub.logging = this.logging;
            this.connection.hub.qs = "version=" + window.jabbr.version;

            this.chat = this.connection.chat;

            this.options = {};
            
            this.transport = $.cookie('jabbr.transport')
            if (this.transport) {
                this.options.transport = this.transport;
            }

            this.initial = true;
            this.restarting = false;

            // Bind chat hub events
            this.chat.client.logOn = $.proxy(this.login, this);
            this.chat.client.logOut = $.proxy(this.performLogout, this);

            kernel.bind('jabbr/client', this);
        },

        activate: function () {
            logger.trace('activated');
        },

        start: function () {
            logger.trace('starting client...');

            this.connection.hub.start(this.options)
                .done($.proxy(this.started, this));

            this.connection.hub.stateChanged($.proxy(this.stateChanged, this));
            this.connection.hub.disconnected($.proxy(this.disconnected, this));

            this.connection.hub.error(function () {
                // Make all pending messages failed if there's an error
                // TODO messages.failPendingMessages();
            });
        },

        started: function () {
            var this_ = this;

            this.chat.server.join().fail(function () {
                logger.warn('join failed');

                if(this_.restarting) {
                    this_.logOut();
                }
            }).done(function () {
                this_.trigger(events.client.started);
            });
        },

        stateChanged: function (change) {
            var eventData = [change, this.initial];
            this.trigger(events.client.stateChanged, eventData);

            if (change.newState === this.connection.connectionState.connected) {
                this.trigger(events.client.connected, eventData);
                initial = false;
            } else if (change.newState === this.connection.connectionState.reconnecting) {
                this.trigger(events.client.reconnecting, eventData);
            }
        },

        disconnected: function () {
            this.connection.hub.log('Dropped the connection from the server. Restarting in 5 seconds.');

            this.trigger(events.client.disconnected);

            this.restarting = true;

            // Restart the connection
            setTimeout(function () {
                this.connection.hub.start(this.options)
                    .done($.proxy(this.started, this));
            }, 5000);
        },

        login: function (rooms, myRooms, preferences, mentions, notifications) {
            logger.trace('login');
            this.trigger(events.client.loggedOn, [rooms, myRooms, mentions, notifications]);
        },

        logout: function () {
            var this_ = this;

            this.performLogout().done(function () {
                this_.chat.server.send('/logout', this_.chat.state.activeRoom)
                    .fail(function (e) {
                        if (e.source == 'HubException') {
                            $window.trigger(events.error, [e.message, 'error', this_.chat.state.activeRoom]);
                        }
                    });
            });
        },

        performLogout: function () {
            var d = $.Deferred();

            $.post('account/logout', {}).done(function () {
                d.resolveWith(null);
                document.location = document.location.pathname;
            });

            return d.promise();
        }
    });
});