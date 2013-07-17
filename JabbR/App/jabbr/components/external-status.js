define([
    'jquery',
    'logger',
    'kernel'
], function ($, Logger, kernel) {
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
                logger.trace('publishing: "' + text + '" (' + type + ')');

                client.chat.server.publishExternalStatus(type, text, timestamp, interval);

                last = {
                    type: type,
                    text: text,
                    timestamp: timestamp
                };
            }
        }

        var lastfm = {
            api_key: '4bf73213fd748d82b28b97c5b41e978c',
            base_url: 'http://ws.audioscrobbler.com/2.0/?format=json',

            enabled: false,
            username: null,
            interval: null,
            timeout: null,

            poll: function () {
                logger.trace('lastfm poll');
                lastfm.clear();

                $.ajax({
                    url: lastfm.base_url + '&method=user.getrecenttracks&user=' +
                         lastfm.username + '&api_key=' + lastfm.api_key
                }).done(lastfm.success);

                lastfm.timeout = setTimeout(lastfm.poll, lastfm.interval * 60 * 1000);
            },
            success: function (data) {
                var lastTrack = data.recenttracks.track[0],
                    nowplaying = lastTrack['@attr'] !== undefined && lastTrack['@attr'].nowplaying == 'true';

                if (nowplaying) {
                    publish('music', lastTrack.name + ' - ' + lastTrack.artist['#text'], 0, lastfm.interval);
                } else {
                    publish(null, null, 0, lastfm.interval);
                }
            },
            set: function (enabled, username, interval) {
                this.enabled = enabled;
                this.username = username;
                this.interval = interval;
            },
            update: function (enabled, username, interval) {
                if (this.enabled != enabled && !enabled) {
                    logger.info('lastfm disabled');
                    this.set(enabled, username, interval);
                    this.clear();
                    return;
                }
                if (enabled && (this.enabled != enabled || this.username != username || this.interval != interval)) {
                    // Still enabled but username or interval has changed
                    logger.info('lastfm enabled or username/interval has changed');
                    this.set(enabled, username, interval);
                    this.clear();

                    this.timeout = setTimeout(this.poll, 1000 * 60); // Initial poll in 30 seconds
                }
            },
            clear: function () {
                if (this.timeout !== null) {
                    clearTimeout(this.timeout);
                }
            }
        };

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

                logger.trace('activated');

                cs.bind(cs.events.changed, clientSettingsChanged);
                clientSettingsChanged();
            }
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/components/external-status', object);
        }

        return object;
    };
});