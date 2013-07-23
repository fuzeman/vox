define([
    'jquery',
    'logger',
    'kernel'
], function ($, Logger, kernel) {
    var logger = new Logger('jabbr/components/external-status.lastfm'),
        cs = null,
        es = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        var apiKey = '4bf73213fd748d82b28b97c5b41e978c',
            baseUrl = 'https://ws.audioscrobbler.com/2.0/?format=json',
            loaded = false,
            lastNothingPlaying = false, // Was the last poll result "nothing playing"

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

        function success(data) {
            if (data.recenttracks !== undefined &&
                data.recenttracks.track !== undefined &&
                data.recenttracks.track.length !== 0) {
                
                var lastTrack = data.recenttracks.track[0],
                    nowplaying = lastTrack['@attr'] !== undefined && lastTrack['@attr'].nowplaying == 'true';

                if (nowplaying) {
                    es.publish('lastfm', 'music', lastTrack.name + ' - ' + lastTrack.artist['#text'], 0, state.interval);
                    lastNothingPlaying = false;
                    return;
                }
            }

            // Nothing currently playing
            if (lastNothingPlaying) {
                es.publish('lastfm', 'music', null, 0, state.interval);
            } else {
                lastNothingPlaying = true;
            }
        }

        function poll() {
            clear();

            if (es.shouldPoll('music')) {
                logger.trace('lastfm poll');
                $.ajax({
                    url: baseUrl + '&method=user.getrecenttracks&user=' +
                        state.username + '&api_key=' + apiKey
                }).done(success);
            } else {
                logger.info('ignoring lastfm poll (shouldPoll)');
            }

            timeout = setTimeout(poll, state.interval * 60 * 1000);
        }

        function update(enabled, username, interval) {
            // just been disabled
            if (state.enabled != enabled && !enabled) {
                logger.info('lastfm disabled');
                set(enabled, username, interval);
                clear();
                return;
            }

            // just enabled or username/interval has changed
            if (enabled && (state.enabled != enabled ||
                state.username != username ||
                state.interval != interval)) {
                logger.info('lastfm enabled or username/interval has changed');
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
                cs.get('lastfm_enabled'),
                cs.get('lastfm_username'),
                parseInt(cs.get('lastfm_interval'), 10)
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
            kernel.bind('jabbr/components/external-status.lastfm', object);
        }

        return object;
    };
});