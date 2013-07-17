define([
    'jquery',
    'logger',
    'kernel',
], function ($, Logger, kernel) {
    var logger = new Logger('jabbr/components/external-status'),
        cs = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        var lastfm = {            
            username: null,
            interval: null,
            enabled: false,
            
            update: function () {
                
            },
            clear: function () {
                
            }
        };

        function clientSettingsChanged () {
            logger.trace('cs.events.changed');
            logger.trace('lastfm_username = ' + cs.get('lastfm_username'));
        }

        return {
            activate: function () {
                cs = kernel.get('jabbr/components/client-settings');
                
                logger.trace('activated');

                cs.bind(cs.events.changed, clientSettingsChanged);
            },
        }
    };
    
    return function () {
        if(object === null) {
            object = initialize();
            kernel.bind('jabbr/components/external-status', object);
        }

        return object;
    };
});