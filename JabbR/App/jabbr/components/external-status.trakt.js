define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/utility'
], function ($, Logger, kernel, utility) {
    var logger = new Logger('jabbr/components/external-status.trakt'),
        cs = null,
        es = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        var loaded = false,
            metadataCache = null,  // Note: currently just stores the metadata for the previous item

            state = {
                enabled: false,
                username: null,
                interval: null
            },
            timeout = null;

        function clear() {
            if (timeout !== null) {
                clearTimeout(timeout);
            }
        }

        function set(enabled, username, interval) {
            state.enabled = enabled;
            state.username = username;
            state.interval = interval;
        }
        
        function getArt(info) {
            var d = $.Deferred();

            if (metadataCache !== null && metadataCache.path == info.trakt.path) {
                d.resolveWith(this, [metadataCache.data.poster]);
            } else {
                $.ajax({
                    url: es.getOriginServer() + '/trakt.tv' + info.trakt.path
                }).done($.proxy(function (data) {
                    metadataCache = {
                        path: info.trakt.path,
                        data: data.result.trakt
                    };

                    d.resolveWith(this, [metadataCache.data.poster]);
                }, this));
            }

            return d.promise();
        }

        function success(data) {
            if (data.result !== null) {
                getArt(data.result).done(function (art) {
                    console.log(art);
                    data.result.art = art;
                    
                    es.publish('trakt', 'video', data.result, 0, state.interval);
                });
            } else {
                es.publish('trakt', 'video', null, 0, state.interval);
            }
        }

        function poll() {
            clear();

            if (es.shouldPoll('video')) {
                logger.trace('trakt poll');
                $.ajax({
                    url: es.getOriginServer() + '/trakt.tv/user/' + state.username
                }).done(success);
            } else {
                logger.info('ignoring trakt poll (shouldPoll)');
            }

            timeout = setTimeout(poll, state.interval * 60 * 1000);
        }

        function update(enabled, username, interval) {
            // just been disabled
            if (state.enabled != enabled && !enabled) {
                logger.info('trakt disabled');

                set(enabled, username, interval);
                clear();
                return;
            }

            // just enabled or username/interval has changed
            if (enabled && (state.enabled != enabled ||
                state.username != username ||
                state.interval != interval)) {
                logger.info('trakt enabled or username/interval has changed');

                set(enabled, username, interval);
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
                cs.get('trakt_enabled'),
                cs.get('trakt_username'),
                parseInt(cs.get('trakt_interval'), 10)
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
            kernel.bind('jabbr/components/external-status.trakt', object);
        }

        return object;
    };
});