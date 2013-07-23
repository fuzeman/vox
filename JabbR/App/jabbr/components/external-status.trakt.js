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
        var apiKey = 'd6d681f0f165c6a61161366c80a56c44',
            baseUrl = 'https://icejabbr-origin.herokuapp.com/trakt/',
            loaded = false,

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
            if (data.action !== undefined) {
                if (data.action == 'watching') {
                    if (data.type == 'episode') {
                        es.publish('trakt', 'video', 
                            data.episode.season + 
                            'x' + utility.padLeft(data.episode.number, 2) + 
                            ' - ' + data.show.title, 0, state.interval);
                    }
                } else {
                    logger.warn('Did not expect "' + data.action + '" action data');
                }
            } else {
                es.publish('trakt', 'video', null, 0, state.interval);
            }
        }

        function poll() {
            clear();

            if (es.shouldPoll('video')) {
                logger.trace('trakt poll');
                $.ajax({
                    url: baseUrl + 'user/watching.json/' + apiKey + '/' + state.username
                }).done(success);
            } else {
                logger.trace('ignoring trakt poll (shouldPoll)');
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