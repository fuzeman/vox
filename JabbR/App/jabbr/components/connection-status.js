/*global define, setTimeout, clearTimeout*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/events',

    'jquery.color'
], function ($, Logger, kernel, events) {
    var logger = new Logger('jabbr/components/connection-status'),
        client = null,
        messages = null,
        object = null;

    logger.trace('loaded');

    var colours = {
        null:           'rgba(255, 255, 255, 0.498)',
        'connected':    'rgba(76, 243, 255, 0.498)',
        'reconnecting': 'rgba(255, 255, 76, 0.498)',
        'disconnected': 'rgba(255, 76, 76, 0.498)'
    };

    var initialize = function () {
        var $tint = $('#background-tint'),
            $banner = $('#heading .banner');

        var current = null;

        function reconnecting() {
            logger.info('reconnecting');

            messages.failPendingMessages();
            update('reconnecting');
        }

        function connected(event, change, initial) {
            logger.info('connected');

            if (initial) {
                setTimeout(function () {
                    update('connected');
                }, 1500);
            } else {
                update('connected');
            }
        }

        function disconnected() {
            logger.info('disconnected');

            messages.failPendingMessages();
            update('disconnected');
        }

        function reset() {
            // Remove all state classes
            for (c in colours) {
                $tint.removeClass(c);
            }
        }

        function update(state) {
            if (state === current) {
                return;
            }

            // Background Tint
            $tint.animate({
                backgroundColor: colours[state],
            }, 1500, function () {
                reset();
                
                $tint.addClass(state)
                     .attr('style', '');
            });

            current = state;


            // Connection Info
            if (state == 'connected') {
                $banner.attr('title', state + ", transport: '" + $.connection.hub.transport.name + "'");
            } else {
                $banner.attr('title', state);
            }
        }

        return {
            activate: function () {
                client = kernel.get('jabbr/client');
                messages = kernel.get('jabbr/components/messages');

                logger.trace('activated');

                client.bind(events.client.reconnecting, reconnecting);
                client.bind(events.client.connected, connected);
                client.bind(events.client.disconnected, disconnected);
            }
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind(object, 'jabbr/components/connection-status');
        }

        return object;
    };
});