/*global define, window, document, setTimeout, setInterval, clearInterval*/
define([
    'jquery',
    'logger',
    'kernel',
], function ($, Logger, kernel) {
    var logger = new Logger('jabbr/ui'),
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        return {
            activate: function () {
                logger.trace('activated');
            }
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/ui', object);
        }

        return object;
    };
});