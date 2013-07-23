define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/components/external-status.evolve',
    'jabbr/components/external-status.lastfm',
    'jabbr/components/external-status.trakt'
], function ($, Logger, kernel, evolve, lastfm, trakt) {
    var logger = new Logger('jabbr/components/external-status'),
        client = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        var last = {
            type: null,
            text: null,
            timestamp: null
        };

        function publish(type, text, timestamp, interval) {
            if (last.type != type || last.text != text) {
                // If we are changing from one type to another
                if (last.type !== null && type !== null && last.type != type) {
                    // Ignore 'nothing' publish
                    if (last.text !== null && text === null) {
                        return;
                    }

                    logger.trace('changing status type from ' + last.type + ' to ' + type);
                    // Games trump everything
                    if (last.type == 'game') {
                        return;
                    }
                    //  Video trumps music
                    if (last.type == 'video' && type == 'music') {
                        return;
                    }
                }

                logger.trace('publishing: "' + text + '" (' + type + ')');

                if (text === null) {
                    type = null;
                }

                client.chat.server.publishExternalStatus(type, text, timestamp, interval);

                last = {
                    type: type,
                    text: text,
                    timestamp: timestamp
                };
            }
        }

        return {
            activate: function () {
                client = kernel.get('jabbr/client');

                evolve.activate();
                lastfm.activate();
                trakt.activate();

                logger.trace('activated');
            },

            publish: publish
        };
    };

    return function () {
        if (object === null) {
            evolve = evolve();
            lastfm = lastfm();
            trakt = trakt();

            object = initialize();
            kernel.bind('jabbr/components/external-status', object);
        }

        return object;
    };
});