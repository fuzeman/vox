/*global define*/
define([
    'jquery',
    'kernel',
    'jabbr/events',

    'jquery.fancybox'
], function ($, kernel, events) {
    return function () {
        var processor = kernel.get('jabbr/messageprocessors/processor');

        processor.bind(events.processor.afterRichElementAttached, function (event, $middle) {
            $('a.imageContent', $middle).fancybox({
                openEffect: 'elastic',
                openSpeed: 400,

                closeEffect: 'elastic',
                closeSpeed: 200,

                helpers: {
                    overlay: {
                        closeClick: true
                    }
                }
            });
        });
    };
});