﻿define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/utility'
], function ($, Logger, kernel, utility) {
    var logger = new Logger('jabbr/components/external-status.steam'),
        cs = null,
        es = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        var loaded = false,
            metadataCache = null,  // Note: currently just stores the metadata for the previous item

            state = {
                enabled: false,
                id: null,
                interval: null
            },
            timeout = null;

        function clear() {
            if (timeout !== null) {
                clearTimeout(timeout);
            }
        }

        function set(enabled, id, interval) {
            state.enabled = enabled;
            state.id = id;
            state.interval = interval;
        }

        function getArt(info) {
            var d = $.Deferred();

            if (metadataCache !== null && metadataCache.path == info.steamcommunity.path) {
                d.resolveWith(this, [metadataCache.data.icon]);
            } else {
                $.ajax({
                    url: es.getOriginServer() + '/steamcommunity.com' + info.steamcommunity.path
                }).done($.proxy(function (data) {
                    metadataCache = {
                        path: info.steamcommunity.path,
                        data: data.result.steamcommunity
                    };

                    d.resolveWith(this, [metadataCache.data.icon]);
                }, this));
            }

            return d.promise();
        }

        function success(data) {
            if (data.result !== null) {
                getArt(data.result).done(function (art) {
                    data.result.art = art;

                    es.publish('steam', 'game', data.result, 0, state.interval);
                });
            } else {
                es.publish('steam', 'game', null, 0, state.interval);
            }
        }

        function poll() {
            clear();

            if (es.shouldPoll('game')) {
                logger.trace('steam poll');
                var requestUrl = null;

                if (state.id.indexOf('7656119') === 0) {
                    requestUrl = es.getOriginServer() + '/steamcommunity.com/profiles/' + state.id;
                } else {
                    requestUrl = es.getOriginServer() + '/steamcommunity.com/id/' + state.id;
                }

                $.ajax({
                    url: requestUrl
                }).done(success);
            } else {
                logger.info('ignoring steam poll (shouldPoll)');
            }

            timeout = setTimeout(poll, state.interval * 60 * 1000);
        }

        function update(enabled, id, interval) {
            // just been disabled
            if (state.enabled != enabled && !enabled) {
                logger.info('steam disabled');

                set(enabled, id, interval);
                clear();
                return;
            }

            // just enabled or id/interval has changed
            if (enabled && (state.enabled != enabled ||
                state.id != id ||
                state.interval != interval)) {
                logger.info('steam enabled or id/interval has changed');

                set(enabled, id, interval);
                clear();
                if (loaded) {
                    timeout = setTimeout(poll, 1000 * 1);
                } else {
                    timeout = setTimeout(poll, 1000 * 5); // Initial poll in 5 seconds
                    loaded = true;
                }
            }
        }

        function settingsChanged() {
            update(
                cs.get('steam_enabled'),
                cs.get('steam_id'),
                parseInt(cs.get('steam_interval'), 10)
            );
        }

        return {
            activate: function () {
                cs = kernel.get('jabbr/components/client-settings');
                es = kernel.get('jabbr/components/external-status');

                logger.trace('activated');

                cs.bind(cs.events.changed, settingsChanged);
                settingsChanged();
            },

            update: update
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/components/external-status.steam', object);
        }

        return object;
    };
});