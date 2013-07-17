define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/components/external-status.lastfm'
], function ($, Logger, kernel, lastfm) {
    var logger = new Logger('jabbr/components/external-status'),
        cs = null,
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

                client.chat.server.publishExternalStatus(type, text, timestamp, interval);

                last = {
                    type: type,
                    text: text,
                    timestamp: timestamp
                };
            }
        }

        function clientSettingsChanged() {
            logger.trace('cs.events.changed');

            lastfm.update(
                cs.get('lastfm_enabled'),
                cs.get('lastfm_username'),
                parseInt(cs.get('lastfm_interval'), 10)
            );
        }

        return {
            activate: function () {
                cs = kernel.get('jabbr/components/client-settings');
                client = kernel.get('jabbr/client');

                lastfm.activate();

                logger.trace('activated');

                cs.bind(cs.events.changed, clientSettingsChanged);
                clientSettingsChanged();
            },

            publish: publish
        };
    };

    return function () {
        if (object === null) {
            lastfm = lastfm();

            object = initialize();
            kernel.bind('jabbr/components/external-status', object);
        }

        return object;
    };
});