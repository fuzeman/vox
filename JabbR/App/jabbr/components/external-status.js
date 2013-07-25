﻿define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/events',
    'jabbr/components/external-status.evolve',
    'jabbr/components/external-status.lastfm',
    'jabbr/components/external-status.steam',
    'jabbr/components/external-status.trakt'
], function ($, Logger, kernel, events, evolve, lastfm, steam, trakt) {
    var logger = new Logger('jabbr/components/external-status'),
        client = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        var currentPublisher = null,
            last = {
                source: null,
                type: null,
                text: null,
                timestamp: null
            };

        function shouldPublish() {
            return currentPublisher == client.connection.hub.id;
        }

        function publish(source, type, text, timestamp, interval) {
            if (!shouldPublish()) {
                logger.info('Not publishing, we are not the active publisher');
                return;
            }
            if (last.type != type || last.text != text) {
                // If we are changing from one type or source to another
                if (last.type !== null && type !== null &&
                    (last.type != type || last.source != source)) {
                    // Ignore 'nothing' publish
                    if (last.text !== null && text === null) {
                        return;
                    }

                    // Games trump everything
                    if (last.type == 'game') {
                        return;
                    }
                    //  Video trumps music
                    if (last.type == 'video' && type == 'music') {
                        return;
                    }

                    logger.info('changing status type from ' + last.type +
                        ' (' + last.source + ') to ' + type + ' (' + source + ')');
                }

                logger.info('publishing: "' + text + '" (' + type + ') (' + source + ')');

                if (text === null) {
                    type = null;
                }

                client.chat.server.publishExternalStatus(type, text, timestamp, interval);

                last = {
                    source: source,
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
                steam.activate();
                trakt.activate();

                logger.trace('activated');

                client.bind(events.client.activityUpdated, function () {
                    if (!shouldPublish()) {
                        client.chat.server.claimPublisher();
                    }
                });

                client.chat.client.publisherChanged = function (clientId) {
                    logger.info('publisherChanged("' + clientId + '")');
                    currentPublisher = clientId;
                    last = {
                        source: null,
                        type: null,
                        text: null,
                        timestamp: null
                    };
                };
            },

            publish: publish,

            getLastPublished: function () {
                return last;
            },
            shouldPublish: shouldPublish,
            shouldPoll: function (type) {
                if (!shouldPublish()) {
                    return false;
                }

                if (last.type === null) {
                    return true;
                }

                // Poll to see if status has cleared
                // or for switching between same-type providers (steam -> evolve)
                if (type == last.type) {
                    return true;
                }

                // Not able to switch from game to video, music
                if (last.type == 'game') {
                    return false;
                }

                // Not able to switch from video to music
                if (last.type == 'video' && type == 'music') {
                    return false;
                }

                return true;
            }
        };
    };

    return function () {
        if (object === null) {
            evolve = evolve();
            lastfm = lastfm();
            steam = steam();
            trakt = trakt();

            object = initialize();
            kernel.bind('jabbr/components/external-status', object);
        }

        return object;
    };
});