define([
    'jquery',
    'logger',
    'kernel'
], function($, Logger, kernel) {
    var logger = new Logger('jabbr/components/client-settings'),
    object = null;

    logger.trace('loaded');

    var initialize = function () {
        var $popup = $('#jabbr-client-settings'),
            $button = $('#preferences .client-settings');
        
        function show () {
            $popup.modal();
        }

        $button.click(show);

        return {
            activate: function () {
                logger.trace('activated');
            },
        }
    };

    return function () {
        if(object === null) {
            object = initialize();
            kernel.bind('jabbr/components/client-settings', object);
        }

        return object;
    };
});